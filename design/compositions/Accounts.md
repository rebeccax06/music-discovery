# Accounts

Registration creates an account. The browser follows it with sign-in, so a new user
enters the app in one interaction. If that second request fails, the account still
exists and the browser offers sign-in with the entered username.

[Register](reaction:Accounts.Register) allocates the account identity. [Login](reaction:Accounts.Login)
verifies the password and issues an HttpOnly cookie. The HTTP policy takes the cookie
credential and expiry out of the JSON response. [Me](reaction:Accounts.Me) restores the
session from the cookie, and [Logout](reaction:Accounts.Logout) ends it in the database
and clears the cookie. For endpoints that issue, read, or clear a cookie, the HTTP
policy requires the configured origin and supplies the session from the cookie.
Protected reactions resolve their actor with
`UserAuthenticating.current` before acting on that user's data.

```endpoints
Accounts.Register at /auth/register
Accounts.Login at /auth/login
Accounts.Me at /auth/me
Accounts.Logout at /auth/logout
```
