(function(){
  var params = new URLSearchParams(window.location.search);
  var username = params.get('user') || 'User';
  var el = document.getElementById('welcome-message');
  if(el){ el.textContent = 'Welcome back, ' + username + '!'; }
})();
