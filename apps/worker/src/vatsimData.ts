export type VatsimOnlineController = {
  cid: number;
  callsign: string;
  logonTime: string;
  rating: number;
};

export async function fetchVatsimOnlineControllers(): Promise<VatsimOnlineController[]> {
  const onlineControllersData = await fetch('https://data.vatsim.net/v3/vatsim-data.json');
  const onlineControllersJson = (await onlineControllersData.json()) as {
    controllers: {
      cid: number;
      callsign: string;
      logon_time: string;
      rating: number;
    }[];
  };

  return onlineControllersJson.controllers.map((c) => ({
    cid: c.cid,
    callsign: c.callsign,
    logonTime: c.logon_time,
    rating: c.rating
  }));
}
