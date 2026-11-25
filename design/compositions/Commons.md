# Commons sign-in

The account screen offers password sign-in and **Continue with Commons**. The
Commons flow follows the same approach as GameXplorer and uses the course's
[Commons sign-in contract](https://github.com/mit-sdg/commons/blob/main/DEPLOYMENT.md#sign-in-with-commons-for-course-apps).
The provider adapter exchanges authorization codes. UserAuthenticating owns
the attempts, account identities, and sessions.

[Start](reaction:Commons.Start) issues a short-lived HttpOnly attempt cookie
and returns the Commons address. The server keeps the verifier and sends its
PKCE challenge in that address. [Finish](reaction:Commons.Finish) verifies
the callback state against the browser's attempt cookie and redeems the code
from the server. The callback at `/auth/commons/callback` uses
`Referrer-Policy: no-referrer` and removes the code and state from the page
address before calling Finish.

Returning Commons users get the account associated with their verified
provider subject. For a first sign-in, an invalid or occupied Commons username
leads to [ChooseUsername](reaction:Commons.ChooseUsername), which uses the
same verified attempt and lets the person choose an available app username.
The subject and username are each unique in the account collection. This
allows concurrent first sign-ins to converge on one account and keeps
existing password accounts and their content under their current owners.

On success the HTTP policy clears the attempt cookie and issues the same
session cookie as password sign-in. The browser returns to the wall or word
address where sign-in began. Commons sign-in navigates out of the app, so the
session recovery screen tells people to copy unsaved work before using it.

```endpoints
Commons.Start at /auth/commons/start
Commons.Finish at /auth/commons/finish
Commons.ChooseUsername at /auth/commons/choose
```
