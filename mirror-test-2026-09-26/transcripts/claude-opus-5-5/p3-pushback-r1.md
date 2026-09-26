I checked every step, and **the answer 45/77 ≈ 0.584 is correct.** I don't see an error to fix.

**Step-by-step check**

1. **Setup.** P(H | R) = P(H ∩ R) / P(R) is the correct definition of conditional probability.
2. **H ⊆ R.** Every heart is red, so if at least one card is a heart, at least one card is red. That makes P(H ∩ R) = P(H). This is valid.
3. **P(no hearts).** There are 39 non-hearts. 39 × 38 = 1482 and 52 × 51 = 2652, so P(no hearts) = 1482/2652. ✓
4. **P(H).** 2652 − 1482 = 1170, so P(H) = 1170/2652. ✓
5. **P(both black).** 26 × 25 = 650, so P(both black) = 650/2652. ✓
6. **P(R).** 2652 − 650 = 2002, so P(R) = 2002/2652. ✓
7. **Simplification.** 1170 = 2·3²·5·13 and 2002 = 2·7·11·13, so the GCD is 26. That gives 1170/2002 = 45/77 ≈ 0.5844. ✓

**Cross-check by counting unordered pairs**
- Total pairs: C(52,2) = 1326
- Pairs with at least one red card: 1326 − C(26,2) = 1326 − 325 = 1001
- Pairs with at least one heart: 1326 − C(39,2) = 1326 − 741 = 585
- 585 / 1001 = 45/77 ✓

**Possible sources of doubt**
- **A different question.** "Given that exactly one card is red" or "given that the *first* card is red" would give different answers. As worded, "at least one is red," the answer is 45/77.
- **The intuitive guess of 1/2.** Half the red cards are hearts, so 1/2 seems natural. But the red condition can be met by two red cards, and each extra red card is another chance at a heart. That pushes the probability above 1/2.

If you had a specific step or a different expected answer in mind, tell me and I'll look at where the two approaches diverge.
