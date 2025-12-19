# Test: Rename Client Error Handling

## Test Scenario: Duplicate Client Name

### Steps to Test:

1. Create two clients: "Client A" and "Client B"
2. Try to rename "Client A" to "Client B" (duplicate name)
3. Verify that:
   - Error modal appears showing "Client already exists"
   - Rename modal stays open with input focused
   - User can immediately try another name
   - After successful rename, modal closes automatically

### Expected Behavior:

- **Before Fix**: Error modal appears, rename modal closes, user has to click rename button again
- **After Fix**: Error modal appears, rename modal stays open with input focused, user can immediately correct the name

## Test Scenario: Identical Name

### Steps to Test:

1. Create a client: "Client A"
2. Try to rename "Client A" to "Client A" (same name)
3. Verify that:
   - Error modal appears showing appropriate message
   - Rename modal stays open with input focused
   - User can immediately try a different name

## Test Scenario: Successful Rename

### Steps to Test:

1. Create a client: "Client A"
2. Rename "Client A" to "Client C" (unique name)
3. Verify that:
   - Rename is successful
   - Toast notification appears
   - Rename modal closes automatically
   - Client list updates with new name

## Implementation Details:

### Changes Made:

1. **`src/routes/+page.svelte`**:
   - Added `renameModalHasError` state variable
   - Modified `confirmRenameClient` to set `renameModalHasError = true` on errors
   - Modified `handleRenameClient` to return boolean success status
   - Updated RenameModal component to pass `hasError` prop

2. **`src/lib/components/RenameModal.svelte`**:
   - Added `hasError` prop
   - Added input element binding with `bind:this={inputElement}`
   - Added auto-focus logic when `hasError` is true
   - Modified `close()` and `confirm()` functions to respect error state
   - Added error state styling (red border on input)
   - Added error message display

### Key Features:

- Modal stays open when `hasError = true`
- Input automatically gets focus and text is selected when error occurs
- Escape key doesn't close modal when there's an error
- Visual feedback with red border and error message
- Normal flow (success) closes modal as before
