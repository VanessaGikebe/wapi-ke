"""Provision an administrator account.

Creates a Supabase Auth invitation and the matching server-controlled RBAC
account. Run from backend/ with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and
SITE_URL configured.

Example:
    python scripts/provision_admin.py admin@example.com "Admin User" --super-admin
"""

from __future__ import annotations

import argparse

from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.models import Account, AccountRole, AccountStatus, AccountType, AdminInvitation
from app.services import supabase_auth

settings = get_settings()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("email")
    parser.add_argument("display_name")
    parser.add_argument(
        "--role",
        choices=["moderator", "administrator", "super_admin"],
        default="administrator",
    )
    parser.add_argument(
        "--super-admin",
        action="store_true",
        help="Shortcut for --role super_admin.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    role = AccountRole.super_admin if args.super_admin else AccountRole(args.role)
    redirect = f"{settings.site_url.rstrip('/')}/auth/callback?next=/admin/dashboard"
    provisioned = supabase_auth.invite_user(
        email=args.email,
        redirect_to=redirect,
        metadata={"account_type": "admin", "role": role.value},
    )

    db = SessionLocal()
    try:
        existing = db.scalar(select(Account).where(Account.email == args.email))
        if existing is not None:
            raise SystemExit(f"Account already exists for {args.email}")
        account = Account(
            auth_user_id=provisioned.auth_user_id,
            email=args.email,
            display_name=args.display_name,
            account_type=AccountType.admin,
            role=role,
            status=AccountStatus.pending_onboarding,
            onboarding_completed=False,
            mfa_required=True,
        )
        db.add(account)
        db.flush()
        db.add(
            AdminInvitation(
                account_id=account.id,
                email=args.email,
                role=role.value,
                activation_link=provisioned.activation_link,
            )
        )
        db.commit()
        print(f"Provisioned {role.value}: {args.email}")
        if provisioned.activation_link:
            print(f"Activation link: {provisioned.activation_link}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
