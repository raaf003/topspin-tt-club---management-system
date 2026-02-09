# Ranking System Fix - Conservative Skill Estimate Implementation

## Problem Statement
Beginners with only 3 wins and 0 losses were appearing 2nd, 3rd, and 4th on the leaderboard despite being inactive. This violated the Glicko-2 principle that new players with high rating uncertainty (RD) should not rank above established players.

## Root Cause
The leaderboard was sorting by raw `rating` instead of `conservative skill estimate` (rating - RD).

## Solution Implemented

### 1. Conservative Rating Calculation
Updated `getTopPerformers()` in `rankingUtils.ts` to sort by:
```typescript
const conservativeRating = rating - rd;
```

This approach:
- New players with RD=350 and any rating appear ~350 points lower
- Established players with RD=50 appear ~50 points lower  
- Gives preference to players with more match history and lower uncertainty

### 2. Fixed RD Calculation for Inactive Periods
Corrected `processRatingPeriod()` to properly track RD growth:
```typescript
const newPhi = Math.sqrt(phi * phi + sigma * sigma);
updates[id] = { mu, phi: newPhi, vol: sigma };
```

### 3. Complete Historical Replay
Modified calculation to process EVERY day from first match to today:
- Ensures RD increases during inactive periods
- Gives accurate uncertainty estimates

### 4. Rating History Tracking  
Added pre-calculation of `rating7DaysAgo` for "Most Improved" metric:
- Captures rating at 7-day boundary while processing

## Debug Logging Added

To verify the fix is working, check browser console for:

### In `calculateAllPlayerStats`:
```
[calcAllPlayerStats] Calculation complete. Total players: X
[calcAllPlayerStats] Sample player (id): rating=Y, rd=Z
```

### In `getTopPerformers`:
```
[getTopPerformers] Called with X players, limit=Y
[getTopPerformers] Saqib Shapoo: rating=1904, rd=..., conservative=..., ratedMatches30=...
[getTopPerformers] Final SORTED ranking: [{rank: 1, name: '...', conservative: X, rating: Y, rd: Z}, ...]
```

### In Leaderboard component:
```
[Leaderboard] Top performers received: [
  { name: '...', score: ..., displayRating: ..., statsRating: ..., statsRd: ... },
  ...
]
```

## How to Verify the Fix

1. **Open Browser Developer Console** (F12 or right-click → Inspect → Console tab)

2. **Navigate to Leaderboard page** in the application

3. **Look for the debug logs** mentioned above

4. **Verify the calculations**:
   - If Mubariz has `rating=1619, rd=350`, then `conservative=1269`
   - If Aqib Kelu has `rating=1608, rd=350`, then `conservative=1258`
   - These should rank BELOW players with ratings in the 1400s or 1600s if those players are established

5. **Expected result**:
   - Established players with low RD (50-100) should be at top
   - New/inactive players with RD=350 should rank much lower
   - Saqib Shapoo (rating ~1900) should be #1
   - Three Beginners should NOT be in top 5

## Files Modified
- `frontend/rankingUtils.ts` - Conservative rating sorting, complete historical replay
- `frontend/context/AppContext.tsx` - Type updates for rating fields
- `frontend/pages/Leaderboard.tsx` - Debug logging  

## Verification Steps
1. Open devtools console
2. Check the debug logs for rd values
3. If rd values are 0 or very small (<50) for the Beginners, check why they weren't updated during inactivity
4. If rd values are ~350, then the calculation is correct and the conservative score should rank them properly

## Next Steps if Issue Persists
1. Check the `calculateAllPlayerStats` debug log to see if rd is being set to the correct values
2. Verify that `getPlayerStats` is returning the rd property
3. Check the Leaderboard component logs to see if stats.rd is undefined
4. If rd is undefined, that means it's not being passed through from globalPlayerStats

