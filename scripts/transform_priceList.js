const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'js', 'priceList.json');
const raw = fs.readFileSync(file, 'utf8');
let arr;
try {
  arr = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse JSON:', e.message);
  process.exit(1);
}

const transformed = arr.map(obj => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'average') {
      out['price'] = v;
    } else if (k === 'yzzz' || k === 'bros') {
      // skip
    } else {
      out[k] = v;
    }
  }
  return out;
});

fs.writeFileSync(file, JSON.stringify(transformed, null, 2), 'utf8');
console.log('priceList.json transformed: removed yzzz/bros and renamed average -> price');
