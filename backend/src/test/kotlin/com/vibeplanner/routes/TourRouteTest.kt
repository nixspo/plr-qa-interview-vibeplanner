package com.vibeplanner.routes

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.vibeplanner.BaseRouteTest
import com.vibeplanner.plugins.dataSource
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.Date

class TourRouteTest : BaseRouteTest() {

    private fun testToken(): String = JWT.create()
        .withAudience("vibe-planner-users")
        .withIssuer("vibe-planner")
        .withClaim("email", "test@vibeplanner.com")
        .withClaim("full_name", "Test User")
        .withExpiresAt(Date(System.currentTimeMillis() + 86_400_000L))
        .sign(Algorithm.HMAC256("test-secret-key"))

    @BeforeEach
    fun clearTours() {
        dataSource.connection.use { conn ->
            conn.createStatement().execute("TRUNCATE tours RESTART IDENTITY")
        }
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    @Test
    fun `GET tours without auth returns 401`() = withTestApp {
        assertEquals(HttpStatusCode.Unauthorized, client.get("/tours").status)
    }

    @Test
    fun `POST tours without auth returns 401`() = withTestApp {
        val response = client.post("/tours") {
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":1042,"maxVolume":8.5,"maxWeight":1500.0,"range":120.0,"vehicleType":"Sprinter 3.5t"}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    // ── GET /tours ─────────────────────────────────────────────────────────────

    @Test
    fun `GET tours returns empty list when no tours exist`() = withTestApp {
        val response = client.get("/tours") { bearerAuth(testToken()) }
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("[]", response.bodyAsText())
    }

    @Test
    fun `GET tours returns all created tours ordered by tour number`() = withTestApp {
        val token = testToken()
        for (num in listOf(2000, 1000, 1500)) {
            client.post("/tours") {
                bearerAuth(token)
                contentType(ContentType.Application.Json)
                setBody("""{"tourNumber":$num,"maxVolume":8.5,"maxWeight":1500.0,"range":120.0,"vehicleType":"Cargo Bike"}""")
            }
        }
        val body = client.get("/tours") { bearerAuth(token) }.bodyAsText()
        val first = body.indexOf("1000")
        val second = body.indexOf("1500")
        val third = body.indexOf("2000")
        assertTrue(first < second && second < third, "Tours should be ordered by tour number")
    }

    // ── POST /tours ────────────────────────────────────────────────────────────

    @Test
    fun `POST tours creates a tour and returns 201 with tour data`() = withTestApp {
        val response = client.post("/tours") {
            bearerAuth(testToken())
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":1042,"maxVolume":8.5,"maxWeight":1500.0,"range":120.0,"vehicleType":"Sprinter 3.5t"}""")
        }
        assertEquals(HttpStatusCode.Created, response.status)
        val body = response.bodyAsText()
        assertTrue(body.contains("1042"))
        assertTrue(body.contains("Sprinter 3.5t"))
        assertTrue(body.contains("8.5"))
    }

    @Test
    fun `POST tours with tour number below 1000 returns 400`() = withTestApp {
        val response = client.post("/tours") {
            bearerAuth(testToken())
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":999,"maxVolume":8.5,"maxWeight":1500.0,"range":120.0,"vehicleType":"Sprinter 3.5t"}""")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `POST tours with tour number above 9999 returns 400`() = withTestApp {
        val response = client.post("/tours") {
            bearerAuth(testToken())
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":10000,"maxVolume":8.5,"maxWeight":1500.0,"range":120.0,"vehicleType":"Sprinter 3.5t"}""")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `POST tours with invalid vehicle type returns 400`() = withTestApp {
        val response = client.post("/tours") {
            bearerAuth(testToken())
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":1043,"maxVolume":8.5,"maxWeight":1500.0,"range":120.0,"vehicleType":"Helicopter"}""")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `POST tours with duplicate tour number returns 500`() = withTestApp {
        val token = testToken()
        val body = """{"tourNumber":1042,"maxVolume":8.5,"maxWeight":1500.0,"range":120.0,"vehicleType":"Cargo Bike"}"""
        client.post("/tours") { bearerAuth(token); contentType(ContentType.Application.Json); setBody(body) }
        val second = client.post("/tours") { bearerAuth(token); contentType(ContentType.Application.Json); setBody(body) }
        assertEquals(HttpStatusCode.InternalServerError, second.status)
    }

    // ── PUT /tours/{id} ────────────────────────────────────────────────────────

    @Test
    fun `PUT tours updates the tour and returns updated data`() = withTestApp {
        val token = testToken()
        val createRes = client.post("/tours") {
            bearerAuth(token)
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":2001,"maxVolume":10.0,"maxWeight":2000.0,"range":150.0,"vehicleType":"Cargo Bike"}""")
        }
        val id = Regex(""""id"\s*:\s*(\d+)""").find(createRes.bodyAsText())!!.groupValues[1]

        val updateRes = client.put("/tours/$id") {
            bearerAuth(token)
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":2001,"maxVolume":12.0,"maxWeight":2500.0,"range":200.0,"vehicleType":"Cargo Bike XL"}""")
        }
        assertEquals(HttpStatusCode.OK, updateRes.status)
        val body = updateRes.bodyAsText()
        assertTrue(body.contains("Cargo Bike XL"))
        assertTrue(body.contains("12.0"))
        assertTrue(body.contains("2500.0"))
    }

    @Test
    fun `PUT tours on non-existent id returns 404`() = withTestApp {
        val response = client.put("/tours/99999") {
            bearerAuth(testToken())
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":3001,"maxVolume":10.0,"maxWeight":1000.0,"range":100.0,"vehicleType":"Sprinter 5t"}""")
        }
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    // ── DELETE /tours/{id} ─────────────────────────────────────────────────────

    @Test
    fun `DELETE tours removes the tour`() = withTestApp {
        val token = testToken()
        val createRes = client.post("/tours") {
            bearerAuth(token)
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":3001,"maxVolume":5.0,"maxWeight":800.0,"range":80.0,"vehicleType":"Cargo Bike"}""")
        }
        val id = Regex(""""id"\s*:\s*(\d+)""").find(createRes.bodyAsText())!!.groupValues[1]

        val deleteRes = client.delete("/tours/$id") { bearerAuth(token) }
        assertEquals(HttpStatusCode.NoContent, deleteRes.status)

        val listBody = client.get("/tours") { bearerAuth(token) }.bodyAsText()
        assertFalse(listBody.contains("3001"))
    }

    @Test
    fun `DELETE tours on non-existent id returns 404`() = withTestApp {
        val response = client.delete("/tours/99999") { bearerAuth(testToken()) }
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    // ── PATCH /tours/{id}/area ─────────────────────────────────────────────────

    @Test
    fun `PATCH area saves GeoJSON polygon and GET returns it`() = withTestApp {
        val token = testToken()
        val createRes = client.post("/tours") {
            bearerAuth(token)
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":4001,"maxVolume":8.0,"maxWeight":1000.0,"range":100.0,"vehicleType":"Cargo Bike"}""")
        }
        val id = Regex(""""id"\s*:\s*(\d+)""").find(createRes.bodyAsText())!!.groupValues[1]

        val area = """{"type":"Polygon","coordinates":[[[8.0,48.0],[9.0,48.0],[9.0,49.0],[8.0,49.0],[8.0,48.0]]]}"""
        val patchRes = client.patch("/tours/$id/area") {
            bearerAuth(token)
            contentType(ContentType.Application.Json)
            setBody("""{"area":$area}""")
        }
        assertEquals(HttpStatusCode.NoContent, patchRes.status)

        val listBody = client.get("/tours") { bearerAuth(token) }.bodyAsText()
        assertTrue(listBody.contains("Polygon"), "GET /tours should include area GeoJSON")
    }

    @Test
    fun `PATCH area with null clears the area`() = withTestApp {
        val token = testToken()
        val createRes = client.post("/tours") {
            bearerAuth(token)
            contentType(ContentType.Application.Json)
            setBody("""{"tourNumber":4002,"maxVolume":8.0,"maxWeight":1000.0,"range":100.0,"vehicleType":"Cargo Bike"}""")
        }
        val id = Regex(""""id"\s*:\s*(\d+)""").find(createRes.bodyAsText())!!.groupValues[1]

        // set area
        client.patch("/tours/$id/area") {
            bearerAuth(token); contentType(ContentType.Application.Json)
            setBody("""{"area":{"type":"Polygon","coordinates":[[[8.0,48.0],[9.0,48.0],[9.0,49.0],[8.0,48.0]]]}}""")
        }

        // clear area
        val clearRes = client.patch("/tours/$id/area") {
            bearerAuth(token); contentType(ContentType.Application.Json)
            setBody("""{"area":null}""")
        }
        assertEquals(HttpStatusCode.NoContent, clearRes.status)
    }

    @Test
    fun `PATCH area on non-existent id returns 404`() = withTestApp {
        val response = client.patch("/tours/99999/area") {
            bearerAuth(testToken())
            contentType(ContentType.Application.Json)
            setBody("""{"area":null}""")
        }
        assertEquals(HttpStatusCode.NotFound, response.status)
    }

    @Test
    fun `PATCH area without auth returns 401`() = withTestApp {
        val response = client.patch("/tours/1/area") {
            contentType(ContentType.Application.Json)
            setBody("""{"area":null}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }
}
