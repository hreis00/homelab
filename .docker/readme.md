# Using Docker to Build and Run the Home Lab

## Building with Dockerfile

To build the application using the Dockerfile, follow these steps:

1. Open a terminal and navigate to the root directory of the project.

2. Build the Docker image using the Dockerfile located in the `storage-bucket` directory:

    ```bash
    docker build -f ./storage-bucket/Dockerfile -t your-image-name:tag .
    ```

    Replace `your-image-name` with a name for your Docker image.

## Running with Docker Compose

To run the application locally using Docker Compose, follow these steps:

1. Ensure you are in the root directory of the project.

2. Start the application with Docker Compose using the `docker-compose.yml` file from the `.docker` directory:

    ```bash
    docker-compose -f ./.docker/docker-compose.yml up -d
    ```

3. To stop the application, press `Ctrl+C` in the terminal or run:

    ```bash
    docker-compose -f ./.docker/docker-compose.yml down
    ```
