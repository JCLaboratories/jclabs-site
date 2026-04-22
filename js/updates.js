function filterEntries(product, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.entry').forEach(entry => {
    if (product === 'all' || entry.dataset.product === product) {
      entry.classList.remove('hidden');
    } else {
      entry.classList.add('hidden');
    }
  });
}
