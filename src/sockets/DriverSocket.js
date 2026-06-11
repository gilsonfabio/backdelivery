const onlineDrivers = new Map();

module.exports = (
  io,
  socket
) => {

  socket.on(
    "driver:connect",
    (data) => {

      const {
        driverId,
        latitude,
        longitude,
      } = data;

      onlineDrivers.set(
        driverId,
        {
          socketId: socket.id,
          latitude,
          longitude,
          status: "A",
        }
      );

      console.log(
        `Motorista ${driverId} online`
      );
    }
  );

  socket.on(
    "driver:updateLocation",
    (data) => {

      const {
        driverId,
        latitude,
        longitude,
      } = data;

      const driver =
        onlineDrivers.get(driverId);

      if (!driver) return;

      driver.latitude = latitude;
      driver.longitude = longitude;

      onlineDrivers.set(
        driverId,
        driver
      );

      io.emit(
        "drivers:update",
        Array.from(
          onlineDrivers.entries()
        ).map(([id, d]) => ({
          id,
          ...d,
        }))
      );
    }
  );

  socket.on(
    "driver:offline",
    (driverId) => {

      onlineDrivers.delete(
        driverId
      );

      io.emit(
        "driver:removed",
        driverId
      );
    }
  );

  socket.on(
    "disconnect",
    () => {

      for (
        const [
          driverId,
          driver,
        ] of onlineDrivers.entries()
      ) {

        if (
          driver.socketId ===
          socket.id
        ) {

          onlineDrivers.delete(
            driverId
          );

          io.emit(
            "driver:removed",
            driverId
          );

          break;
        }
      }
    }
  );

};