import smtplib
import time

HOST = "smtp.gmail.com"
PORT = 587

FROM_EMAIL = "jainikpatel670@gmail.com"    # Sender Gmail
PASSWORD = "your_app_password_here"        # Your App Password

# Read email addresses from emails.txt
with open("emails.txt", "r") as f:
    TO_EMAILS = [line.strip() for line in f if line.strip()]

MESSAGE = """Subject: Test Email
Hi,
This is a test mail sent via Python to multiple recipients from a file.

Thanks,
Test Account
"""

try:
    smtp = smtplib.SMTP(HOST, PORT)
    smtp.ehlo()
    smtp.starttls()
    smtp.login(FROM_EMAIL, PASSWORD)

    for email in TO_EMAILS:
        smtp.sendmail(FROM_EMAIL, email, MESSAGE)
        print(f"[+] Email sent to {email}")
        time.sleep(2)  # Small delay to avoid Gmail spam detection

    smtp.quit()
    print("[+] All emails sent successfully!")

except Exception as e:
    print(f"[-] Error: {e}")
