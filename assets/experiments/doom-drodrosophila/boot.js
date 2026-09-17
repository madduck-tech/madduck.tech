// A separate bootstrap catches missing modules as well as initialization failures.
import('./demo.js').catch((error) => {
  document.getElementById('lab-loading').hidden = true;
  document.getElementById('webgl-error').hidden = false;
  document.getElementById('retry').onclick = () => location.reload();
  console.error('Fly scene modules could not load:', error);
});
