let counter = 0;

const add1Button = document.querySelector('#add-1');
const counterSpan = document.querySelector('#counter');
add1Button.addEventListener('click', () => {
  counterSpan.textContent = `${++counter}`;
});
