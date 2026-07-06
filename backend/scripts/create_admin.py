"""Bootstrap / manage administrator accounts from the CLI.

Admins are **never** created by the public. This script is the trusted path
(alongside a super admin inviting others in-app) for creating the first super
admin and, if needed, additional admins directly.

It provisions a **Supabase Auth** account (so the admin can sign in through the
normal frontend login) and mirrors a local ``users`` row — keyed by the Supabase
user id — with ``account_type='admin'`` plus an ``admin_roles`` tier. When
Supabase is not configured it falls back to a local-only account (usable for
backend/curl testing, but not the Supabase frontend login) and warns.

Usage (from the ``backend/`` directory)::

    python scripts/create_admin.py --email you@wapike.co.ke --name "Jane Doe" \
        --password "a-strong-password" --role super_admin

Roles: moderator | administrator | super_admin (default: super_admin).
"""

from __future__ import annotations

import argparse
import sys
import uuid

from sqlalchemy import select

from app.config import get_settings
from app.core.security import hash_password
from app.db import SessionLocal
from app.models import (
    AccountType,
    AdminRole,
    AdminRoleAssignment,
    User,
)
from app.services import supabase_admin


def _provision_supabase(email: str, name: str, password: str | None) -> str | None:
    """Ensure a Supabase auth account exists; return its user id (or None when
    Supabase isn't configured)."""

    if not supabase_admin.is_configured():
        print(
            "! Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY). "
            "Creating a LOCAL-ONLY admin - this account cannot sign in through "
            "the Supabase frontend login until Supabase is configured."
        )
        return None

    meta = {"full_name": name, "account_type": "admin"}
    try:
        created = supabase_admin.create_user(
            email, password=password, user_metadata=meta, email_confirm=True
        )
        print(f"[ok] Created Supabase auth account for {email}.")
        return str(created["id"])
    except supabase_admin.SupabaseUserExists:
        existing = supabase_admin.get_user_by_email(email)
        if existing is None:
            raise SystemExit(
                "Supabase reports the user exists but it could not be looked up."
            )
        print(f"[ok] Reusing existing Supabase auth account for {email}.")
        return str(existing["id"])


def create_admin(
    email: str, name: str, password: str | None, role: AdminRole
) -> None:
    email = email.strip().lower()

    supabase_id = _provision_supabase(email, name, password)

    with SessionLocal() as db:
        user: User | None = None
        if supabase_id is not None:
            user = db.get(User, uuid.UUID(supabase_id))
        if user is None:
            user = db.scalar(select(User).where(User.email == email))

        if user is None:
            if supabase_id is None and not password:
                raise SystemExit(
                    "A new local-only admin requires --password to set their "
                    "initial password."
                )
            user = User(
                id=uuid.UUID(supabase_id) if supabase_id else uuid.uuid4(),
                email=email,
                name=name,
                password_hash=hash_password(password or "unused-supabase-login"),
                account_type=AccountType.admin,
                is_active=True,
            )
            db.add(user)
            db.flush()  # assign user.id before creating the role row
            action = "Created"
        else:
            user.account_type = AccountType.admin
            user.is_active = True
            if name:
                user.name = name
            if password:
                user.password_hash = hash_password(password)
            action = "Updated"

        assignment = db.scalar(
            select(AdminRoleAssignment).where(
                AdminRoleAssignment.user_id == user.id
            )
        )
        if assignment is None:
            db.add(AdminRoleAssignment(user_id=user.id, role=role))
        else:
            assignment.role = role

        db.commit()

    print(f"{action} admin '{email}' with tier '{role.value}'.")

    # Offer a magic link for a first passwordless sign-in / password reset.
    if supabase_id is not None:
        try:
            link = supabase_admin.generate_magic_link(
                email, redirect_to=f"{get_settings().frontend_url}/admin/activate"
            )
            print(f"\nActivation magic link (valid ~24h):\n{link}\n")
        except supabase_admin.SupabaseAdminError as exc:  # pragma: no cover
            print(f"(Could not generate a magic link: {exc})")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Create or update an admin.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default="Administrator")
    parser.add_argument(
        "--password",
        default=None,
        help="Sets the initial password (email+password login). Optional when "
        "the admin will activate via the magic link.",
    )
    parser.add_argument(
        "--role",
        default=AdminRole.super_admin.value,
        choices=[r.value for r in AdminRole],
    )
    args = parser.parse_args(argv)

    create_admin(
        email=args.email,
        name=args.name,
        password=args.password,
        role=AdminRole(args.role),
    )


if __name__ == "__main__":
    main(sys.argv[1:])
