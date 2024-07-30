<script>
    import { onMount } from 'svelte';

  
    onMount(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) {
        console.log(token);
        localStorage.setItem('token', token);
      }
    });
  </script>