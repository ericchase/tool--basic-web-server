import { counter, increment } from './component/counter.js';

const add1Button = document.querySelector('#add-1');
const counterSpan = document.querySelector('#counter');
add1Button.addEventListener('click', () => {
  increment();
  counterSpan.textContent = `${counter}`;
});
