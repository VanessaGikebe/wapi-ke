"""Bootstrap / manage administrator accounts from the CLI.

Admins are **never** created by the public. This script is the trusted path
(alongside a super admin inviting others in-app) for creating the first super
admin and, if needed, additional admins directly.

Usage (from the ``backend/`` directory)::

    python scripts/create_admin.py --email you@wapike.co.ke --name "Jane Doe" \
        --password "a-strong-password" --role super_admin

If a user with that email already exists, they are promoted to an admin account
and their tier is set/updated (their password is left unchanged unless
``--password`` is given).

Roles: moderator | administrator | super_admin (default: super_admin).
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db import SessionLocal
from app.models import (
    AccountType,
    AdminRole,
    AdminRoleAssignment,
    User,
)


def create_admin(
    email: str, name: str, password: str | None, role: AdminRole
) -> None:
    email = email.strip().lower()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            if not password:
                raise SystemExit(
                    "A new admin requires --password to set their initial "
                    "password."
                )
            user = User(
                email=email,
                name=name,
                password_hash=hash_password(password),
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


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Create or update an admin.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default="Administrator")
    parser.add_argument(
        "--password",
        default=None,
        help="Required for a new admin; optional when updating an existing one.",
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
