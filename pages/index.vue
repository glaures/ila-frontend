<script setup>
const iservLogin = () => {
  const redirectUri = encodeURIComponent('http://localhost:3000/auth-redirect')
  const clientId = '17_65m4l0ih9v8c84cwgsk08osc8s8o8cwsowo4k0s80gwoow448k'
  const authUrl = `https://jmoosdorf.de/iserv/oauth/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid%20profile%20email`

  window.location.href = authUrl
}
</script>

