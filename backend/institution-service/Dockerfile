FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn clean package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S microlinks && adduser -S microlinks -G microlinks
COPY --from=builder /app/target/*.jar app.jar
USER microlinks
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:docker}", "app.jar"]
