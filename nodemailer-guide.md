# Nodemailer General Guide

> **Nodemailer** is the most popular email sending library for Node.js — zero runtime dependencies, secure by design, and universally supported.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Creating a Transporter](#creating-a-transporter)
4. [SMTP Configuration](#smtp-configuration)
5. [Authentication Methods](#authentication-methods)
6. [Composing Messages](#composing-messages)
7. [Attachments](#attachments)
8. [Embedded Images](#embedded-images)
9. [HTML Emails](#html-emails)
10. [Connection Pooling](#connection-pooling)
11. [Verifying the Connection](#verifying-the-connection)
12. [Error Handling](#error-handling)
13. [Testing with Ethereal](#testing-with-ethereal)
14. [Common SMTP Providers](#common-smtp-providers)
15. [Security Best Practices](#security-best-practices)

---

## Installation

```bash
npm install nodemailer
```

**Requirements:** Node.js v6.0.0 or later. Async/await examples require Node.js v8.0.0+.

---

## Quick Start

Sending an email with Nodemailer involves three steps:

1. **Create a transporter** — configure your SMTP server or transport method
2. **Compose your message** — define sender, recipient(s), subject, and content
3. **Send the email** — call `transporter.sendMail()`

```js
const nodemailer = require("nodemailer");

// 1. Create transporter
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 2. Send email
const info = await transporter.sendMail({
  from: '"Your Name" <you@example.com>',
  to: "recipient@example.com",
  subject: "Hello from Nodemailer!",
  text: "Hello world?",
  html: "<b>Hello world?</b>",
});

console.log("Message sent:", info.messageId);
```

---

## Creating a Transporter

A **transporter** is the object responsible for connecting to your mail server and sending messages. Create it **once** and reuse it throughout your application.

```js
const transporter = nodemailer.createTransport(options[, defaults]);
```

| Parameter  | Type                     | Description                                                                 |
|------------|--------------------------|-----------------------------------------------------------------------------|
| `options`  | Object / String / Plugin | SMTP config object, a connection URL, or a transport plugin                 |
| `defaults` | Object *(optional)*      | Default values merged into every message (e.g., a common `from` address)   |

**Using a connection URL:**

```js
// Standard SMTP
const transporter = nodemailer.createTransport("smtp://user:pass@smtp.example.com:587");

// Secure SMTP (TLS from the start)
const transporter = nodemailer.createTransport("smtps://user:pass@smtp.example.com:465");
```

---

## SMTP Configuration

### General Options

| Option        | Default       | Description                                                               |
|---------------|---------------|---------------------------------------------------------------------------|
| `host`        | `"localhost"` | Hostname or IP of the SMTP server                                         |
| `port`        | `587`         | Port number (`465` if `secure: true`)                                     |
| `secure`      | `false`       | Use TLS immediately. Set `true` for port 465, `false` for 587/25          |
| `service`     | —             | Shortcut for well-known services like `"gmail"` or `"outlook"`            |
| `auth`        | —             | Authentication credentials object                                         |
| `authMethod`  | `"PLAIN"`     | SASL auth method: `"PLAIN"`, `"LOGIN"`, or `"CRAM-MD5"`                  |

> ⚠️ **`secure: false` does NOT mean unencrypted.** Nodemailer automatically uses **STARTTLS** when the server supports it.

### TLS Options

| Option              | Description                                                              |
|---------------------|--------------------------------------------------------------------------|
| `tls`               | Additional TLS options passed to Node.js `TLSSocket`                    |
| `tls.rejectUnauthorized` | Set `false` to accept self-signed certs *(dev only)*              |
| `tls.servername`    | Required when `host` is an IP address — used for TLS certificate validation |
| `ignoreTLS`         | Disable STARTTLS even if the server supports it                          |
| `requireTLS`        | Fail if the server doesn't support STARTTLS                              |

### Connection Options

| Option                | Default        | Description                                              |
|-----------------------|----------------|----------------------------------------------------------|
| `connectionTimeout`   | `120000` ms    | Timeout waiting for TCP connection                       |
| `greetingTimeout`     | `30000` ms     | Timeout waiting for server greeting                      |
| `socketTimeout`       | `600000` ms    | Idle connection timeout (10 minutes)                     |
| `dnsTimeout`          | `30000` ms     | Timeout for DNS lookups                                  |

### Example Configurations

**Standard (port 587, STARTTLS):**
```js
nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: { user: "user", pass: "password" },
});
```

**Secure (port 465, TLS):**
```js
nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  auth: { user: "user", pass: "password" },
});
```

**Self-signed certificate (dev only):**
```js
nodemailer.createTransport({
  host: "my.internal.smtp",
  port: 465,
  secure: true,
  auth: { user: "user", pass: "password" },
  tls: { rejectUnauthorized: false },
});
```

---

## Authentication Methods

### Login (Username & Password)

The default and most common method. Nodemailer automatically selects the best mechanism (PLAIN, LOGIN, or CRAM-MD5).

```js
auth: {
  type: "login",   // optional, this is the default
  user: "username",
  pass: "password",
}
```

### OAuth 2.0

For Gmail, Outlook, and other OAuth-supporting services. More secure — no stored passwords.

```js
auth: {
  type: "oauth2",
  user: "user@example.com",
  accessToken: "your_generated_access_token",
  expires: 1484314697598, // token expiry timestamp in ms
}
```

> See the [Nodemailer OAuth2 Guide](https://nodemailer.com/smtp/oauth2) for token refresh setup.

---

## Composing Messages

Pass a message configuration object to `transporter.sendMail()`.

### Core Fields

| Field       | Description                                                        |
|-------------|--------------------------------------------------------------------|
| `from`      | Sender address — `"Name <email>"` or just `"email"`               |
| `to`        | Recipient(s) — comma-separated string or array                     |
| `cc`        | Carbon copy recipient(s)                                           |
| `bcc`       | Blind carbon copy recipient(s)                                     |
| `subject`   | Email subject line                                                 |
| `text`      | Plain-text body                                                    |
| `html`      | HTML body (shown instead of `text` in modern email clients)        |
| `replyTo`   | Reply-to address                                                   |
| `headers`   | Custom email headers as key-value object                           |
| `priority`  | `"high"`, `"normal"`, or `"low"`                                  |

### Example

```js
await transporter.sendMail({
  from: '"Support Team" <support@example.com>',
  to: ["alice@example.com", "bob@example.com"],
  cc: "manager@example.com",
  bcc: "archive@example.com",
  replyTo: "noreply@example.com",
  subject: "Your order is confirmed ✔",
  text: "Thank you for your order.",
  html: "<h1>Thank you for your order!</h1><p>We'll ship it soon.</p>",
  priority: "high",
});
```

### sendMail Return Value

| Property     | Description                                          |
|--------------|------------------------------------------------------|
| `messageId`  | The Message-ID header assigned to the email          |
| `envelope`   | SMTP envelope object with `from` and `to`            |
| `accepted`   | Array of accepted recipient addresses                |
| `rejected`   | Array of rejected recipient addresses                |
| `response`   | Final response string from the SMTP server           |

> 📌 A message is considered **sent** if at least one recipient is accepted. Always check `rejected` for partial failures.

---

## Attachments

Add files to your email using the `attachments` array.

```js
await transporter.sendMail({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Files attached",
  text: "Please find the attachments.",
  attachments: [
    // From file path
    {
      filename: "report.pdf",
      path: "/path/to/report.pdf",
    },
    // From URL
    {
      filename: "logo.png",
      path: "https://example.com/logo.png",
    },
    // From a string (inline content)
    {
      filename: "notes.txt",
      content: "These are my notes.",
    },
    // From a Buffer
    {
      filename: "data.csv",
      content: Buffer.from("name,age\nAlice,30"),
      contentType: "text/csv",
    },
    // With custom content disposition
    {
      filename: "invoice.pdf",
      path: "/path/to/invoice.pdf",
      contentDisposition: "inline",
    },
  ],
});
```

### Attachment Options

| Option               | Description                                                    |
|----------------------|----------------------------------------------------------------|
| `filename`           | Filename shown to recipient                                    |
| `path`               | File path or URL to read content from                          |
| `content`            | String, Buffer, or Stream of file content                      |
| `contentType`        | MIME type (auto-detected if omitted)                           |
| `contentDisposition` | `"attachment"` (default) or `"inline"`                         |
| `cid`                | Content ID for embedding images in HTML                        |
| `encoding`           | Encoding for string content (e.g., `"base64"`, `"utf-8"`)     |

---

## Embedded Images

Embed images directly in the HTML body using **Content-ID (CID)** references.

```js
await transporter.sendMail({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Embedded image",
  html: '<p>Here is our logo:</p><img src="cid:logo@company"/>',
  attachments: [
    {
      filename: "logo.png",
      path: "/path/to/logo.png",
      cid: "logo@company", // must match the cid in the HTML src
    },
  ],
});
```

---

## HTML Emails

Send rich HTML emails with automatic plain-text fallback.

```js
await transporter.sendMail({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Welcome!",
  text: "Welcome to our service!", // fallback for plain-text clients
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #333;">Welcome! 🎉</h1>
      <p>Thanks for signing up. Click the button below to get started.</p>
      <a href="https://example.com/start"
         style="background:#4CAF50;color:white;padding:12px 24px;
                text-decoration:none;border-radius:4px;display:inline-block;">
        Get Started
      </a>
    </div>
  `,
});
```

> 💡 Always include a `text` version as a fallback for email clients that don't render HTML.

---

## Connection Pooling

For high-volume sending, use pooled connections to reuse SMTP connections across multiple messages.

```js
const transporter = nodemailer.createTransport({
  pool: true,               // enable pooling
  host: "smtp.example.com",
  port: 465,
  secure: true,
  auth: {
    user: "username",
    pass: "password",
  },
  maxConnections: 5,        // max simultaneous connections (default: 5)
  maxMessages: 100,         // messages per connection before cycling (default: 100)
  rateDelta: 1000,          // time window in ms for rate limiting
  rateLimit: 5,             // max messages per rateDelta window
});
```

**Close the pool when done:**
```js
transporter.close();
```

---

## Verifying the Connection

Test your SMTP configuration before sending any real mail.

```js
try {
  await transporter.verify();
  console.log("✅ Server is ready to take messages");
} catch (err) {
  console.error("❌ Verification failed:", err);
}
```

`verify()` checks: DNS resolution, TCP connection, TLS/STARTTLS, and authentication.

> ⚠️ `verify()` does **not** confirm whether the server will accept mail from a specific sender address — that is only known at send time.

---

## Error Handling

Always wrap `sendMail()` in a try/catch when using async/await:

```js
try {
  const info = await transporter.sendMail({
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "Test",
    text: "Hello!",
  });

  console.log("Sent:", info.messageId);

  // Check for partial failures (multi-recipient)
  if (info.rejected.length > 0) {
    console.warn("Rejected addresses:", info.rejected);
  }
} catch (err) {
  // Connection errors, auth failures, etc.
  console.error("Failed to send:", err.message);
}
```

**Using callbacks:**
```js
transporter.sendMail(mailOptions, (err, info) => {
  if (err) return console.error("Error:", err);
  console.log("Sent:", info.messageId);
});
```

---

## Testing with Ethereal

[Ethereal](https://ethereal.email) captures emails during development — nothing is actually delivered, and every sent message gets a browser-viewable preview URL.

### Auto-generate a Test Account

```js
const nodemailer = require("nodemailer");

async function sendTestEmail() {
  // Create a temporary Ethereal account
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const info = await transporter.sendMail({
    from: '"Test Sender" <test@ethereal.email>',
    to: "test@example.com",
    subject: "Test Email",
    text: "Hello from Ethereal!",
    html: "<b>Hello from Ethereal!</b>",
  });

  console.log("Message sent:", info.messageId);
  // Preview URL — open this in your browser to see the email
  console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
}

sendTestEmail();
```

---

## Common SMTP Providers

| Provider               | Host                          | Port  | `secure` | Notes                                  |
|------------------------|-------------------------------|-------|----------|----------------------------------------|
| **Gmail**              | `smtp.gmail.com`              | `587` | `false`  | Use App Password (requires 2FA)        |
| **Outlook / Hotmail**  | `smtp.office365.com`          | `587` | `false`  | Use `service: "outlook"` shortcut      |
| **Yahoo Mail**         | `smtp.mail.yahoo.com`         | `465` | `true`   | Use App Password                       |
| **Zoho Mail**          | `smtp.zoho.com`               | `587` | `false`  | —                                      |
| **SendGrid**           | `smtp.sendgrid.net`           | `587` | `false`  | Use API key as password                |
| **Mailgun**            | `smtp.mailgun.org`            | `587` | `false`  | Use API credentials                    |
| **Mailtrap (testing)** | `sandbox.smtp.mailtrap.io`    | `587` | `false`  | Test inbox, emails not delivered       |
| **Ethereal (testing)** | `smtp.ethereal.email`         | `587` | `false`  | Auto-generate test account             |

**Using the `service` shortcut:**
```js
nodemailer.createTransport({
  service: "gmail",   // auto-fills host, port, secure
  auth: {
    user: "you@gmail.com",
    pass: "your_app_password",
  },
});
```

---

## Security Best Practices

1. **Never hardcode credentials** — always use environment variables (`.env` + `dotenv`)
   ```js
   auth: {
     user: process.env.SMTP_USER,
     pass: process.env.SMTP_PASS,
   }
   ```

2. **Use App Passwords for Gmail/Yahoo** — don't use your real account password; generate a dedicated App Password from your Google/Yahoo account settings.

3. **Prefer OAuth2 over passwords** for production Gmail/Outlook deployments — no credential exposure risk.

4. **Keep `rejectUnauthorized: false` out of production** — only disable TLS certificate validation in local dev environments.

5. **Use `disableFileAccess` and `disableUrlAccess`** if you don't need file/URL attachments, to reduce attack surface:
   ```js
   nodemailer.createTransport({
     // ...
     disableFileAccess: true,
     disableUrlAccess: true,
   });
   ```

6. **Add `.env` to `.gitignore`** — never commit credentials to version control.

7. **Validate email inputs** on your backend before passing them to `sendMail()` to prevent header injection.

---

## Further Reading

- [Official Nodemailer Docs](https://nodemailer.com/)
- [Message Configuration](https://nodemailer.com/message)
- [SMTP Transport Reference](https://nodemailer.com/smtp)
- [OAuth2 Setup Guide](https://nodemailer.com/smtp/oauth2)
- [Pooled SMTP Connections](https://nodemailer.com/smtp/pooled)
- [Well-Known Services List](https://nodemailer.com/smtp/well-known-services)
- [Ethereal Test Email Service](https://ethereal.email)
- [Nodemailer on GitHub](https://github.com/nodemailer/nodemailer)

---

*Generated from the official Nodemailer documentation at [nodemailer.com](https://nodemailer.com)*
