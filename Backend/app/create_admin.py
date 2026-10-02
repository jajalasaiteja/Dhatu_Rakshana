"""CLI utility to safely create or update the initial platform administrator account."""

import sys
import os
import argparse
import getpass
from pathlib import Path
from datetime import datetime, timezone

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from sqlmodel import Session, select, or_
from app.db.session import engine, init_db
from app.models.user import User
from app.core.security import hash_password

def create_admin(
    username: str,
    email: str,
    password: str,
    full_name: str = "Platform Administrator"
) -> User:
    """Creates a new admin user or elevates an existing user to admin."""
    init_db()

    clean_username = username.strip().lower()
    clean_email = email.strip().lower()

    if not clean_username:
        raise ValueError("Username cannot be empty.")
    if not clean_email or "@" not in clean_email:
        raise ValueError("A valid email address is required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long.")

    with Session(engine) as session:
        user = session.exec(
            select(User).where(or_(User.email == clean_email, User.username == clean_username))
        ).first()

        if user:
            print(f"[*] Existing user record found for {clean_email} (username: {user.username}).")
            user.username = clean_username
            user.email = clean_email
            user.password_hash = hash_password(password)
            user.role = "admin"
            user.is_active = True
            user.full_name = full_name or user.full_name
            user.updated_at = datetime.now(timezone.utc)
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"[✓] Successfully updated user '{user.username}' ({user.email}) to Administrator role.")
            return user
        else:
            new_admin = User(
                username=clean_username,
                email=clean_email,
                password_hash=hash_password(password),
                full_name=full_name or "Platform Administrator",
                role="admin",
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            session.add(new_admin)
            session.commit()
            session.refresh(new_admin)
            print(f"[✓] Successfully created new Administrator: username='{new_admin.username}', email='{new_admin.email}' (ID: {new_admin.id}).")
            return new_admin

def main():
    parser = argparse.ArgumentParser(description="Create or update Dhatu Rakshana platform administrator account.")
    parser.add_argument("--username", "-u", type=str, default=os.getenv("ADMIN_USERNAME"), help="Admin username")
    parser.add_argument("--email", "-e", type=str, default=os.getenv("ADMIN_EMAIL"), help="Admin email address")
    parser.add_argument("--password", "-p", type=str, default=os.getenv("ADMIN_PASSWORD"), help="Admin password")
    parser.add_argument("--full-name", "-n", type=str, default="Platform Administrator", help="Admin full name")

    args = parser.parse_args()

    username = args.username
    email = args.email
    password = args.password
    full_name = args.full_name

    # Interactive prompts if arguments not supplied
    if not username:
        try:
            username = input("Enter admin username: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.")
            sys.exit(1)

    if not email:
        try:
            email = input("Enter admin email address: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.")
            sys.exit(1)

    if not password:
        try:
            password = getpass.getpass("Enter admin password (min 6 characters): ")
            confirm = getpass.getpass("Confirm admin password: ")
            if password != confirm:
                print("[!] Error: Passwords do not match.")
                sys.exit(1)
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.")
            sys.exit(1)

    try:
        create_admin(
            username=username,
            email=email,
            password=password,
            full_name=full_name
        )
    except Exception as exc:
        print(f"[!] Error creating admin user: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    main()
