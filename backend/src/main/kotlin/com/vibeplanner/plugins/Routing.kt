package com.vibeplanner.plugins

import com.vibeplanner.routes.authRoutes
import com.vibeplanner.routes.healthRoutes
import com.vibeplanner.routes.tourRoutes
import io.ktor.server.application.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
    routing {
        healthRoutes()
        authRoutes()
        tourRoutes()
    }
}
