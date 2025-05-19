import Keycloak from "keycloak-js"

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: import.meta.env.VITE_KEYCLOAK_REALM as string,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
})

try {
  console.log("loading keycloak")
  await keycloak
    .init({
      onLoad: "login-required",
      flow: "implicit",
    })
    .then((authenticated) => {
      if (authenticated) {
        console.log("User is authenticated")
      } else {
        console.log("User is not authenticated")
      }
      if (keycloak.token) {
        localStorage.setItem("token", keycloak.token)
      }
    })
} catch (error) {
  console.error("Failed to initialize adapter:", error)
}
export default keycloak
