# Test Fix Todo List

## Summary
Test suite shows 11 failed tests and 192 passed tests across 18 test files. Main issues are in FormInput and Notification components.

---

## 🔥 High Priority - Failing Tests (11 total)

### FormInput Component Tests (8 failures)
**File:** `src/components/FormInput.test.jsx`

1. **✅ TODO: Fix FormInput rendering test**
   - Issue: Component not rendering properly
   - Fix: Verify FormInput component export and basic render functionality

2. **✅ TODO: Fix FormInput value display**
   - Issue: Value not displaying correctly in input
   - Fix: Check value prop handling and input field binding

3. **✅ TODO: Fix FormInput onChange handler**
   - Issue: onChange callback not working
   - Fix: Verify event handling and callback invocation

4. **✅ TODO: Fix FormInput number type handling**
   - Issue: Number input type validation failing
   - Fix: Check type prop handling and number validation logic

5. **✅ TODO: Fix FormInput prefix/suffix display**
   - Issue: Prefix and suffix not rendering
   - Fix: Verify prefix/suffix components and CSS styling

6. **✅ TODO: Fix FormInput placeholder**
   - Issue: Placeholder not showing
   - Fix: Check placeholder prop passing to input element

7. **✅ TODO: Fix FormInput disabled state**
   - Issue: Disabled state not working
   - Fix: Verify disabled prop handling and styling

8. **✅ TODO: Fix FormInput clear functionality**
   - Issue: Clear button not working
   - Fix: Check clearable prop and clear button event handling

### Notification Component Tests (3 failures)
**File:** `src/components/Notification.test.jsx`

9. **✅ TODO: Fix Notification auto-dismiss with act() wrapper**
   - Issue: React state updates not wrapped in act()
   - Fix: Wrap timer-based state updates in act() for testing

10. **✅ TODO: Fix Notification default duration with act() wrapper**
    - Issue: Default duration test has act() warnings
    - Fix: Wrap setTimeout/timer logic in act()

11. **✅ TODO: Fix Notification component mount/unmount**
    - Issue: Component lifecycle causing act() warnings
    - Fix: Properly handle async state updates in tests

---

## 🟡 Medium Priority - Test Warnings

### Permalink Tests (Non-blocking warnings)
**File:** `src/utils/permalink.test.js`

12. **✅ TODO: Improve error handling in decodeScenarioFromURL**
    - Issue: Expected error logging for malformed JSON
    - Fix: Add better error handling/logging (test is actually passing)

### Data Validation Warnings
**Files:** `src/App.localStorage.test.jsx`, `src/utils/multiParty-calculations.test.js`

13. **✅ TODO: Review validation warning logs**
    - Issue: Expected validation warnings cluttering test output
    - Fix: Consider suppressing expected validation errors in tests

---

## 🟢 Low Priority - Code Quality

14. **✅ TODO: Update test descriptions for clarity**
    - Many tests have verbose debug output
    - Clean up console.log statements in test files

15. **✅ TODO: Review test coverage**
    - 192/204 tests passing (94% pass rate)
    - Identify any missing test cases for new functionality

---

## 🔧 Technical Debt

16. **✅ TODO: Standardize test patterns**
    - Some tests use different assertion styles
    - Ensure consistent use of act() for async operations

17. **✅ TODO: Mock timer cleanup**
    - Several tests use setTimeout/timers
    - Ensure proper cleanup to prevent test interference

---

## 📋 Estimated Work

- **High Priority (11 tests):** ~4-6 hours
- **Medium Priority:** ~1-2 hours  
- **Low Priority:** ~1 hour

**Total Estimated Time:** 6-9 hours

---

## 🎯 Success Criteria

- [ ] All 11 failing tests pass
- [ ] No act() warnings in console
- [ ] Test suite runs clean with minimal warnings
- [ ] 100% test pass rate (204/204)
- [ ] No broken functionality after fixes

---

## 📝 Notes

- FormInput component seems to be the main issue (8/11 failures)
- Most failures appear to be basic component functionality
- Notification component has async/timer issues requiring act() wrappers
- Overall test architecture is solid (94% pass rate indicates good coverage)