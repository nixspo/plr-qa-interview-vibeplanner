package com.vibeplanner.routes

import com.vibeplanner.plugins.withConnection
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import org.postgresql.util.PGobject

@Serializable
data class Tour(
    val id: Int,
    val tourNumber: Int,
    val maxVolume: Double,
    val maxWeight: Double,
    val range: Double,
    val vehicleType: String,
    val area: JsonElement? = null,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class TourRequest(
    val tourNumber: Int,
    val maxVolume: Double,
    val maxWeight: Double,
    val range: Double,
    val vehicleType: String
)

@Serializable
data class TourAreaRequest(
    val area: JsonElement?
)

val VEHICLE_TYPES = setOf(
    "Cargo Bike",
    "Cargo Bike XL",
    "Sprinter 3.5t",
    "Sprinter 5t",
    "Transporter 2.8t",
    "Box Truck 7.5t",
    "Box Truck 12t"
)

private fun areaFromString(value: String?): JsonElement? =
    if (value != null) Json.parseToJsonElement(value) else null

private fun jsonbParam(json: JsonElement?): PGobject = PGobject().apply {
    type = "jsonb"
    this.value = if (json == null || json == JsonNull) null else json.toString()
}

fun Routing.tourRoutes() {
    authenticate("auth-jwt") {
        get("/tours") {
            val tours = withConnection { conn ->
                conn.prepareStatement(
                    "SELECT id, tour_number, max_volume, max_weight, range, vehicle_type, area::text, created_at, updated_at FROM tours ORDER BY tour_number"
                ).use { stmt ->
                    stmt.executeQuery().use { rs ->
                        val list = mutableListOf<Tour>()
                        while (rs.next()) {
                            list.add(
                                Tour(
                                    id = rs.getInt("id"),
                                    tourNumber = rs.getInt("tour_number"),
                                    maxVolume = rs.getDouble("max_volume"),
                                    maxWeight = rs.getDouble("max_weight"),
                                    range = rs.getDouble("range"),
                                    vehicleType = rs.getString("vehicle_type"),
                                    area = areaFromString(rs.getString("area")),
                                    createdAt = rs.getTimestamp("created_at").toString(),
                                    updatedAt = rs.getTimestamp("updated_at").toString()
                                )
                            )
                        }
                        list
                    }
                }
            }
            call.respond(HttpStatusCode.OK, tours)
        }

        post("/tours") {
            val req = call.receive<TourRequest>()

            if (req.tourNumber < 1000 || req.tourNumber > 9999) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("Tour number must be between 1000 and 9999"))
                return@post
            }
            if (req.vehicleType !in VEHICLE_TYPES) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid vehicle type"))
                return@post
            }

            val tour = withConnection { conn ->
                conn.prepareStatement(
                    "INSERT INTO tours (tour_number, max_volume, max_weight, range, vehicle_type) VALUES (?, ?, ?, ?, ?) RETURNING id, tour_number, max_volume, max_weight, range, vehicle_type, area::text, created_at, updated_at"
                ).use { stmt ->
                    stmt.setInt(1, req.tourNumber)
                    stmt.setDouble(2, req.maxVolume)
                    stmt.setDouble(3, req.maxWeight)
                    stmt.setDouble(4, req.range)
                    stmt.setString(5, req.vehicleType)
                    stmt.executeQuery().use { rs ->
                        if (rs.next()) Tour(
                            id = rs.getInt("id"),
                            tourNumber = rs.getInt("tour_number"),
                            maxVolume = rs.getDouble("max_volume"),
                            maxWeight = rs.getDouble("max_weight"),
                            range = rs.getDouble("range"),
                            vehicleType = rs.getString("vehicle_type"),
                            area = areaFromString(rs.getString("area")),
                            createdAt = rs.getTimestamp("created_at").toString(),
                            updatedAt = rs.getTimestamp("updated_at").toString()
                        ) else null
                    }
                }
            }

            if (tour == null) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to create tour"))
            } else {
                call.respond(HttpStatusCode.Created, tour)
            }
        }

        put("/tours/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour id"))

            val req = call.receive<TourRequest>()

            if (req.tourNumber < 1000 || req.tourNumber > 9999) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("Tour number must be between 1000 and 9999"))
                return@put
            }
            if (req.vehicleType !in VEHICLE_TYPES) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid vehicle type"))
                return@put
            }

            val tour = withConnection { conn ->
                conn.prepareStatement(
                    "UPDATE tours SET tour_number=?, max_volume=?, max_weight=?, range=?, vehicle_type=?, updated_at=NOW() WHERE id=? RETURNING id, tour_number, max_volume, max_weight, range, vehicle_type, area::text, created_at, updated_at"
                ).use { stmt ->
                    stmt.setInt(1, req.tourNumber)
                    stmt.setDouble(2, req.maxVolume)
                    stmt.setDouble(3, req.maxWeight)
                    stmt.setDouble(4, req.range)
                    stmt.setString(5, req.vehicleType)
                    stmt.setInt(6, id)
                    stmt.executeQuery().use { rs ->
                        if (rs.next()) Tour(
                            id = rs.getInt("id"),
                            tourNumber = rs.getInt("tour_number"),
                            maxVolume = rs.getDouble("max_volume"),
                            maxWeight = rs.getDouble("max_weight"),
                            range = rs.getDouble("range"),
                            vehicleType = rs.getString("vehicle_type"),
                            area = areaFromString(rs.getString("area")),
                            createdAt = rs.getTimestamp("created_at").toString(),
                            updatedAt = rs.getTimestamp("updated_at").toString()
                        ) else null
                    }
                }
            }

            if (tour == null) {
                call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
            } else {
                call.respond(HttpStatusCode.OK, tour)
            }
        }

        patch("/tours/{id}/area") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour id"))

            val req = call.receive<TourAreaRequest>()

            val updated = withConnection { conn ->
                conn.prepareStatement(
                    "UPDATE tours SET area=?, updated_at=NOW() WHERE id=? RETURNING id"
                ).use { stmt ->
                    stmt.setObject(1, jsonbParam(req.area))
                    stmt.setInt(2, id)
                    stmt.executeQuery().use { rs -> rs.next() }
                }
            }

            if (!updated) {
                call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
            } else {
                call.respond(HttpStatusCode.NoContent)
            }
        }

        delete("/tours/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid tour id"))

            val deleted = withConnection { conn ->
                conn.prepareStatement("DELETE FROM tours WHERE id = ?").use { stmt ->
                    stmt.setInt(1, id)
                    stmt.executeUpdate()
                }
            }

            if (deleted == 0) {
                call.respond(HttpStatusCode.NotFound, ErrorResponse("Tour not found"))
            } else {
                call.respond(HttpStatusCode.NoContent)
            }
        }
    }
}
