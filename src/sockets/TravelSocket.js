const acceptedTravels =
new Map();

module.exports = (
  io,
  socket
) => {

  socket.on(
    "travel:accept",
    (data) => {

      const {
        tvlId,
        driverId
      } = data;

      acceptedTravels.set(
        tvlId,
        driverId
      );

      io.emit(
        `travel:accepted:${tvlId}`,
        {
          tvlId,
          driverId
        }
      );
    }
  );

};