import Keycloak from "keycloak-js"

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: import.meta.env.VITE_KEYCLOAK_REALM as string,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
})

export const initKeycloak = async (): Promise<boolean> => {
  try {
    console.log("loading keycloak")
    const authenticated = await keycloak.init({
      onLoad: "login-required",
      flow: "implicit",
    })

    if (authenticated) {
      console.log("User is authenticated")
    } else {
      console.log("User is not authenticated")
    }

    return authenticated
  } catch (error: unknown) {
    console.error("Failed to initialize adapter:", error instanceof Error ? error.message : String(error))
    return false
  }
}

export default keycloak
