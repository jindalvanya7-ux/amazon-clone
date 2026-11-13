document.querySelectorAll('.qty-form').forEach(function (form) {
  const input = form.querySelector('input[name="quantity"]');
  if (!input) return;
  input.addEventListener('change', function () {
    form.submit();
  });
});
