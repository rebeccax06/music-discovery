# Friending

## Purpose

Let two people agree to be connected, so that each can find the other and an
application can give friends access it does not give strangers. Neither person can
create the connection alone.

## Principle

Daniel *requests* friendship with Alex. Nothing changes for either of them until Alex
*accepts*; then each appears among the other's friends. Had Alex *declined*, or had
Daniel *cancelled* first, there would be no request and no friendship, and Daniel
could ask again later. Either friend can later *unfriend* the other, which ends the
friendship for both.

## Types

```types
external Person
  An opaque identity for someone who can befriend others.
```

## State

```state
a set of Requests with
  a sender Person
  a recipient Person
  unique sender and recipient

a set of Friendships with
  a first Person
  a second Person
  unique first and second

Rule: A friendship has no direction. Store its two people in one fixed order so that each pair has at most one friendship.
Rule: Two friends have no request between them in either direction.
```

## Actions

```actions
request(sender: Person, recipient: Person) : returns ()
  where sender is recipient
  then
    refuses SELF_REQUEST "You cannot add yourself as a friend."
  where sender and recipient are already friends
  then
    refuses ALREADY_FRIENDS "You are already friends."
  where recipient has already requested sender
  then
    refuses REQUEST_WAITING "They have already asked to be your friend. Accept their request."
  where sender has already requested recipient
  then
    refuses REQUEST_EXISTS "You have already asked. They have not answered yet."
  where the two are different people, are not friends, and have no request between them
  then
    create a request from sender to recipient
    returns

accept(recipient: Person, sender: Person) : returns ()
  where there is no request from sender to recipient
  then
    refuses NO_REQUEST "This friend request is no longer waiting."
  where there is a request from sender to recipient
  then
    remove every request between the two and create their friendship
    returns

decline(recipient: Person, sender: Person) : returns ()
  where there is no request from sender to recipient
  then
    refuses NO_REQUEST "This friend request is no longer waiting."
  where there is a request from sender to recipient
  then
    remove the request
    returns

cancel(sender: Person, recipient: Person) : returns ()
  where there is no request from sender to recipient
  then
    refuses NO_REQUEST "This friend request is no longer waiting."
  where there is a request from sender to recipient
  then
    remove the request
    returns

unfriend(person: Person, friend: Person) : returns ()
  where the two are not friends
  then
    refuses NOT_FRIENDS "You are not friends."
  where the two are friends
  then
    remove their friendship
    returns
```

## Queries

```queries
_friends(person: Person) : many (friend: Person)
  Returns every friend of person in unspecified order. Returns no rows when person has none.

_friendship(person: Person, other: Person) : optional (friend: Person)
  Returns one row naming other when person and other are friends, and no row otherwise.

_received(recipient: Person) : many (sender: Person)
  Returns everyone whose request to recipient is waiting, in unspecified order.

_sent(sender: Person) : many (recipient: Person)
  Returns everyone sender has asked who has not answered, in unspecified order.
```
