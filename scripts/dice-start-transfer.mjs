// Author-only answers; no implementation is supplied to learner files.
export function startTransfer({ step, practice }) {
  step('Turn a request into cases {#transfer-plan}',
    'A club needs a booking calculator: each visitor pays 4 credits; a group of at least 3 visitors receives 2 credits off the whole booking. Bookings contain 1 through 6 visitors. Invalid input must fail without quoting a price.\n\nBefore writing C++, make an input/expected-result table. Include the smallest booking, both sides of the discount boundary, the largest booking, an out-of-range number and a word. Calculate answers by hand: expectations come from the request, not whatever your program prints.\n\nFor 3 visitors the price is 3 × 4 − 2 = 10. The discount is not 2 per visitor. Predict the prices for 2 and 4 visitors before opening the next step.\n\nWrite three small jobs: read and validate, calculate, display. Finish one working calculation before adding decorations. This is a tiny backlog: an ordered list of work. Every C++ operation needed has already been taught; no loops or classes are required.');
  const original = `#include <iostream>
int booking_price(int visitors) {
    int price = visitors * 4;
    if (visitors >= 3) price = price - 2;
    return price;
}
int main() {
    int visitors = 0;
    if (!(std::cin >> visitors) || visitors < 1 || visitors > 6) return 1;
    std::cout << "price=" << booking_price(visitors) << '\\n';
    return 0;
}`;
  const valid = (input, price) => ({ input: `${input}\n`, out: `price=${price}\n` });
  const invalid = input => ({ input: `${input}\n`, opts: 'exit=1 without="price="' });
  practice('Deliver a booking calculator {#transfer-build}',
    'Implement the club request from your table. Put the calculation in a function that returns an integer and does not print. Choose its name and parameters yourself. main reads one integer, rejects values outside 1 through 6 with exit 1 and no price line, otherwise prints price= followed by the result and returns 0. Token extraction is sufficient; whole-line validation comes later. Compare these examples with your predictions before running.',
    'practice/booking.cpp', original,
    [valid(1, 4), valid(2, 8), valid(3, 10), valid(4, 14), valid(6, 22), invalid(0), invalid(7), invalid('word')],
    ['Separate invalid requests from valid requests that receive no discount.', 'Start with visitors times four; only the threshold branch changes that price.', 'Return the calculated price from your function; perform input and output in main.'],
    [{ name: 'misses the first discounted booking', code: original.replace('visitors >= 3', 'visitors > 3'), fails: [3] },
      { name: 'discounts every visitor', code: original.replace('price - 2', 'price - visitors * 2'), fails: [3, 4] },
      { name: 'accepts an empty booking', code: original.replace('visitors < 1', 'visitors < 0'), fails: [6] }],
    'Hide the examples and add your own valid case. Trace input through validation, the call, the returned number and output. Deliberately change >= to > in your discount condition. Which case exposes it? Restore the rule. Compiler acceptance does not establish that the price is correct.');
  const changed = original.replace('int booking_price(int visitors)', 'int booking_price(int visitors, int rate)')
    .replace('visitors * 4', 'visitors * rate').replace('int visitors = 0;', 'int visitors = 0, rate = 0;')
    .replace('std::cin >> visitors', 'std::cin >> visitors >> rate')
    .replace('visitors > 6)', 'visitors > 6 || rate < 1 || rate > 10)')
    .replace('booking_price(visitors)', 'booking_price(visitors, rate)');
  practice('Respond to a changed request {#transfer-change}',
    'The club now supplies the per-visitor rate as a second integer, from 1 through 10. The visitor range and one 2-credit group discount stay the same. Update your existing booking.cpp, keeping calculation separate from input/output. A missing or invalid rate must return 1 without printing a price. Before editing, record which requirement changed, one new case and one old behavior that must survive. Old one-number input is intentionally replaced by two-number input; rate 4 must preserve the old prices.',
    'practice/booking.cpp', changed,
    [valid('2 4', 8), valid('3 4', 10), valid('4 5', 18), valid('3 1', 1), valid('6 10', 58), invalid('2 0'), invalid('2 11'), invalid('2'), invalid('2 word'), invalid('0 4')],
    ['Identify the fixed value that became input, and the unchanged rules.', 'The calculation needs the new rate; validation must succeed for both inputs.', 'Pass the rate into the function instead of keeping four inside its multiplication.'],
    [{ name: 'ignores the new rate', code: changed.replace('visitors * rate', 'visitors * 4'), fails: [3, 4] },
      { name: 'removes the old discount', code: changed.replace('price - 2', 'price - 0'), fails: [2, 3] },
      { name: 'accepts an invalid rate', code: changed.replace(' || rate < 1 || rate > 10', ''), fails: [6, 7] }],
    'Review only your changed lines. Explain why both the function definition and its call changed. Rechecking rate 4 is a regression check: it protects behavior that should survive a change. Write three sentences: what you delivered, a mistake a case caught, and what you would do differently next time. After a break, explain the boundary and call without reopening the example. If stuck, revisit A04 decisions or A05 returned values, then retry. This is practice, not a verdict on your ability.');
}
