import Keycloak from "keycloak-js"
import { env } from "@/lib/env"

const keycloak = new Keycloak({
  url: env.keycloakUrl,
  realm: env.keycloakRealm,
  clientId: env.keycloakClientId,
})

export const initKeycloak = async (): Promise<boolean> => {
  try {
    console.log("loading keycloak")
    const authenticated = await keycloak.init({
      onLoad: "login-required",
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
