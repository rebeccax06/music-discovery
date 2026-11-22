import { endpoint, receive, respond, type EndpointValidator } from "@mit-sdg/sync-engine/boundary";
import { no, view, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Annotating, Associating, UserAuthenticating } = concepts;

const ExampleOnOwnedWord = view(
  "example (annotation) on word (association) owned by (user)",
  ({ annotation, association, user }) => where(
    Associating._get({ association }).is({ user }),
    Annotating._get({ annotation }).is({ context: association }),
  ),
).holds();

function isIdentity(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

function exampleInput(fields: Record<string, (value: unknown) => boolean> = {}) {
  const checks = {
    session: (value: unknown) => value === null || typeof value === "string",
    association: isIdentity,
    annotation: isIdentity,
    ...fields,
  };
  const entries = Object.entries(checks);
  const invalid = { ok: false, detail: "Check the example and try again." } as const;
  const validate: EndpointValidator = (value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return invalid;
    const input = value as Record<string, unknown>;
    const valid = Object.keys(input).length === entries.length && entries.every(([key, check]) =>
      Object.hasOwn(input, key) && check(input[key]),
    );
    return valid ? { ok: true } : invalid;
  };
  return { input: { required: Object.keys(checks) }, validators: { input: validate } };
}

const Update = endpoint("/examples/update", ({ session, user, association, annotation, role, note }) =>
  receive({ session, association, annotation, role, note })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(ExampleOnOwnedWord({ annotation, association, user }))
        .then(Annotating.update({ author: user, annotation, role, note }).responds({}))
        .then(respond({})).named("owned-example"),
      where(no(ExampleOnOwnedWord({ annotation, association, user })))
        .then(respond({ error: "UNKNOWN_ANNOTATION" })).named("example-unavailable"),
    ), exampleInput({
    role: (value) => value === "EXAMPLE" || value === "COUNTEREXAMPLE",
    note: (value) => typeof value === "string",
  }));

const SetVisibility = endpoint("/examples/visibility", ({ session, user, association, annotation, visibility }) =>
  receive({ session, association, annotation, visibility })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(ExampleOnOwnedWord({ annotation, association, user }))
        .then(Annotating.setVisibility({ author: user, annotation, visibility }).responds({}))
        .then(respond({})).named("owned-example"),
      where(no(ExampleOnOwnedWord({ annotation, association, user })))
        .then(respond({ error: "UNKNOWN_ANNOTATION" })).named("example-unavailable"),
    ), exampleInput({ visibility: (value) => value === "PRIVATE" || value === "SHARED" }));

const Remove = endpoint("/examples/remove", ({ session, user, association, annotation }) =>
  receive({ session, association, annotation })
    .then(UserAuthenticating.current({ session }).responds({ user }))
    .then(
      where(ExampleOnOwnedWord({ annotation, association, user }))
        .then(Annotating.remove({ author: user, annotation }).responds({}))
        .then(respond({})).named("owned-example"),
      where(no(ExampleOnOwnedWord({ annotation, association, user })))
        .then(respond({ error: "UNKNOWN_ANNOTATION" })).named("example-unavailable"),
    ), exampleInput());

export const composition = { ExampleOnOwnedWord, Update, SetVisibility, Remove };
