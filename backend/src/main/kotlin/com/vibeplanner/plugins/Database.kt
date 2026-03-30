package com.vibeplanner.plugins

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.application.*
import java.sql.Connection

lateinit var dataSource: HikariDataSource

fun Application.configureDatabase() {
    val host = environment.config.property("database.host").getString()
    val port = environment.config.property("database.port").getString()
    val name = environment.config.property("database.name").getString()
    val user = environment.config.property("database.user").getString()
    val password = environment.config.property("database.password").getString()

    val config = HikariConfig().apply {
        jdbcUrl = "jdbc:postgresql://$host:$port/$name"
        username = user
        this.password = password
        maximumPoolSize = 10
        isAutoCommit = false
        transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        validate()
    }

    dataSource = HikariDataSource(config)
    log.info("Database connection pool initialized")
}

fun <T> withConnection(block: (Connection) -> T): T {
    return dataSource.connection.use { connection ->
        val result = block(connection)
        if (!connection.autoCommit) connection.commit()
        result
    }
}
