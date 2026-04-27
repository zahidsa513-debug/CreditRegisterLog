# Security Specification for Credit Registry App

## Data Invariants
1. A **Customer** must belong to an existing **Area**. (Note: In Firestore we'll use string IDs).
2. A **Sale** must be associated with a **Customer** (unless it's a `direct` type).
3. All records (**Areas**, **Customers**, **Sales**, **Settings**) MUST contain a `userId` that matches the authenticated user's UID.
4. Users cannot read or write data belonging to other users.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Attempt to create an `Area` with a `userId` different from `request.auth.uid`.
2. **Cross-Tenant Read**: Attempt to `get` a `Customer` document belonging to another user.
3. **Malicious ID**: Attempt to create a document with a 2KB string as ID.
4. **Invalid Type**: Set `cashSale` to a string instead of a number.
5. **Missing Required Field**: Create a `Sale` without a `date`.
6. **Shadow Field**: Update a `Sale` with an unapproved field like `isAdmin: true`.
7. **Privilege Escalation**: Attempt to delete another user's `Settings`.
8. **Resource Exhaustion**: Send a 1MB string in the `description` field.
9. **Timestamp Fraud**: Set `createdAt` to a date in the future (though we use `request.time`).
10. **Orphaned Sale**: Create a `payment` for a `customerId` that doesn't exist (relational check).
11. **Negative Amount**: Set `cashSale` to -5000.
12. **Unauthorized List**: Query all `Sales` across the entire collection without filtering by `userId`.

## Test Runner (Planned)
The test suite will verify all above scenarios return `PERMISSION_DENIED`.
