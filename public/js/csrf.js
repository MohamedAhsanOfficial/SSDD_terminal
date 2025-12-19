(function(){
  function addCsrfToken(token){
    var form = document.getElementById('login-form');
    if(!form) return;
    var existing = document.querySelector('input[name="_csrf"]');
    if(!existing){
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_csrf';
      input.value = token;
      form.appendChild(input);
    } else {
      existing.value = token;
    }
  }

  function fetchToken(){
    fetch('/csrf-token', { credentials: 'same-origin' })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if(data && data.csrfToken){ addCsrfToken(data.csrfToken); }
      })
      .catch(function(){ /* ignore */ });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fetchToken);
  } else {
    fetchToken();
  }
})();
