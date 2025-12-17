# Implementation Plan: Analyses d'eau Module

## Overview
Implement a new "Analyses d'eau" (Water Analysis) module for tracking monthly microbiological quality of water across different structures (workplaces).

## Data Model
```
water_analyses store:
- id: unique identifier
- structure_id: links to workplace.id
- sample_date: date sample was taken
- result_date: date result was received
- result: enum (pending, potable, non_potable)
- notes: optional text
- created_at: timestamp
```

## Business Logic
### Monthly Workflow:
1. **To Do**: No record exists for current month
2. **Pending**: Sample taken (user records this)
3. **OK**: Potable result entered
4. **ALERT**: Non-potable result (requires re-test cycle)

### Re-test Logic:
- Non-potable results trigger new analysis requirement
- Continue until potable result obtained

## Implementation Steps

### Step 1: Database Layer (db.js)
- [ ] Add WATER_ANALYSES to STORES constant
- [ ] Implement water analysis CRUD operations
- [ ] Integrate backupService triggers
- [ ] Update export/import functionality

### Step 2: Business Logic (logic.js)
- [ ] Add water analysis calculation functions
- [ ] Implement monthly status determination
- [ ] Add dashboard statistics for water analyses
- [ ] Create date utility functions for monthly cycles

### Step 3: UI Components
- [ ] Create WaterAnalyses.jsx main component
- [ ] Create WaterAnalysesOverview.jsx (current month view)
- [ ] Create WaterAnalysesHistory.jsx (history table)
- [ ] Create WaterAnalysisForm.jsx (for entering results)

### Step 4: Navigation Integration
- [ ] Add "Analyses d'eau" to sidebar navigation
- [ ] Update App.jsx routing
- [ ] Ensure proper navigation flow

### Step 5: Dashboard Integration
- [ ] Add high-priority alert for non-potable results
- [ ] Add summary count for pending analyses
- [ ] Integrate into existing dashboard stats

### Step 6: Testing & Validation
- [ ] Test all CRUD operations
- [ ] Validate backup integration
- [ ] Test UI interactions
- [ ] Verify dashboard alerts

## Files to Create/Modify

### New Files:
- `src/components/WaterAnalyses.jsx`
- `src/components/WaterAnalysesOverview.jsx`
- `src/components/WaterAnalysesHistory.jsx`
- `src/components/WaterAnalysisForm.jsx`

### Modified Files:
- `src/services/db.js` (add water_analyses store)
- `src/services/logic.js` (add water analysis logic)
- `src/App.jsx` (add navigation)
- `src/components/Dashboard.jsx` (add water alerts)

## Success Criteria
- [ ] Complete monthly workflow management
- [ ] Proper backup integration
- [ ] Intuitive UI with clear status indicators
- [ ] Dashboard alerts for critical situations
- [ ] Historical data tracking and viewing
- [ ] No breaking changes to existing functionality
