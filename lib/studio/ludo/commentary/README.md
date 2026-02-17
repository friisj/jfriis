# AI Commentary Spike

## Quick Start

1. **Get API Keys:**
   - Gemini: https://aistudio.google.com/apikey
   - ElevenLabs: https://elevenlabs.io/app/settings/api-keys

2. **Open Test Page:**
   ```
   http://localhost:3001/commentary-spike
   ```

3. **Run Tests:**
   - Enter both API keys
   - Click "Initialize Clients"
   - Try "Quick Test" for single scenario
   - Try "Run All Tests" for 6 scenarios

## What We're Testing

### Text Quality (Gemini 2.0 Flash)
- Does it generate natural, in-character dialogue?
- Is AGGRESSIVE actually aggressive?
- Are responses varied or repetitive?

### Voice Quality (ElevenLabs Turbo v2.5)
- Does voice sound natural or robotic?
- Do personalities sound distinct?
- Is audio quality acceptable?

### Latency
- **Target**: <1 second total
- **Acceptable**: 600-800ms
- **Problematic**: >1 second

### Integration
- How easy is context assembly?
- Any API reliability issues?
- Cost per commentary in practice?

## Test Scenarios

1. **Opening** - AGGRESSIVE: "8/5 6/5" (3-1 split)
2. **Hit** - AGGRESSIVE: "13/7*" (sending checker to bar)
3. **Double** - AGGRESSIVE: "Double to 2" (offering cube)
4. **Win** - AGGRESSIVE: "Victory" (game won)
5. **Opening** - DEFENSIVE: "24/23 13/11" (2-1 cautious)
6. **Prime** - TACTICAL: "8/4 6/4" (building 4-point prime)

## Success Criteria

### ✅ Ship it eventually if:
- Text sounds natural and in-character
- Voice quality is engaging (not robotic)
- Latency < 1 second achievable
- Feature feels delightful

### 🤔 Needs refinement if:
- Text is generic/repetitive (prompt engineering)
- Voice quality is marginal (try different voices)
- Latency 1-2 seconds (needs caching/streaming)

### ❌ Table indefinitely if:
- Text quality fundamentally weak
- Voice sounds artificial regardless
- Latency > 2 seconds (too disruptive)
- APIs unreliable/expensive

## Files Created

- `/src/lib/commentary/spike.ts` - Core implementation
- `/src/app/commentary-spike/page.tsx` - Test UI
- `/src/lib/commentary/README.md` - This file

## Next Steps

After testing:
1. Document results in console logs
2. Update roadmap with findings
3. Decide: go/no-go/refine
4. Resume Phase 2.6 work
