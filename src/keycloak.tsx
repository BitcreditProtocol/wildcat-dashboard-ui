import Keycloak from "keycloak-js"

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL as string,
  realm: import.meta.env.VITE_KEYCLOAK_REALM as string,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string,
})

// Initialize function that can be awaited by importing code
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

    if (keycloak.token) {
      localStorage.setItem("token", keycloak.token)
    }

    return authenticated
  } catch (error: unknown) {
    // Properly type the error and safely log it
    console.error("Failed to initialize adapter:", error instanceof Error ? error.message : String(error))
    return false
  }
}

export default keycloak
