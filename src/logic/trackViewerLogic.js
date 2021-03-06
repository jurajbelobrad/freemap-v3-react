import axios from 'axios';
import { createLogic } from 'redux-logic';
import turfLineDistance from '@turf/line-distance';
import toGeoJSON from '@mapbox/togeojson';
import { startProgress, stopProgress } from 'fm3/actions/mainActions';
import { trackViewerSetData, trackViewerSetTrackUID } from 'fm3/actions/trackViewerActions';
import { toastsAddError } from 'fm3/actions/toastsActions';

export const trackViewerSetTrackDataLogic = createLogic({
  type: 'TRACK_VIEWER_SET_TRACK_DATA',
  transform({ action }, next) {
    if (!action.payload.trackGpx) {
      next(action);
      return;
    }

    // TODO add error handling for failed string-to-gpx and gpx-to-geojson parsing
    const gpxAsXml = new DOMParser().parseFromString(action.payload.trackGpx, 'text/xml');
    const trackGeojson = toGeoJSON.gpx(gpxAsXml);

    const startPoints = [];
    const finishPoints = [];
    trackGeojson.features.forEach((feature) => {
      if (feature.geometry.type === 'LineString') {
        const lengthInKm = turfLineDistance(feature);
        const coords = feature.geometry.coordinates;
        const startLonlat = coords[0];
        let startTime;
        let finishTime;
        const times = feature.properties.coordTimes;
        if (times) {
          [startTime] = times;
          finishTime = times[times.length - 1];
        }
        startPoints.push({ lat: startLonlat[1], lon: startLonlat[0], startTime });

        const finishLonLat = coords[coords.length - 1];
        finishPoints.push({
          lat: finishLonLat[1], lon: finishLonLat[0], lengthInKm, finishTime,
        });
      }
    });
    next({
      ...action,
      payload: {
        ...action.payload, trackGeojson, startPoints, finishPoints,
      },
    });
  },
});

export const trackViewerDownloadTrackLogic = createLogic({
  type: 'TRACK_VIEWER_DOWNLOAD_TRACK',
  process({ getState }, dispatch, done) {
    const { trackUID } = getState().trackViewer;
    axios.get(`${process.env.API_URL}/tracklogs/${trackUID}`, { validateStatus: status => status === 200 })
      .then(({ data }) => {
        if (data.error) {
          dispatch(toastsAddError(`Nastala chyba pri získavaní GPX záznamu: ${data.error}`));
        } else {
          const trackGpx = atob(data.data);
          dispatch(trackViewerSetData({ trackGpx }));
        }
      })
      .catch((e) => {
        dispatch(toastsAddError(`Nastala chyba pri získavaní GPX záznamu: ${e.message}`));
      })
      .then(() => {
        done();
      });
  },
});

export const trackViewerUploadTrackLogic = createLogic({
  type: 'TRACK_VIEWER_UPLOAD_TRACK',
  process({ getState, cancelled$, storeDispatch }, dispatch, done) {
    const { trackGpx } = getState().trackViewer;
    if (trackGpx.length > (process.env.MAX_GPX_TRACK_SIZE_IN_MB * 1000000)) {
      dispatch(toastsAddError(`Veľkosť nahraného súboru prevyšuje ${process.env.MAX_GPX_TRACK_SIZE_IN_MB} MB. Zdieľanie podporujeme len pre menšie súbory.`));
    } else {
      const pid = Math.random();
      dispatch(startProgress(pid));
      const source = axios.CancelToken.source();
      cancelled$.subscribe(() => {
        source.cancel();
      });

      axios.post(`${process.env.API_URL}/tracklogs`, {
        data: btoa(unescape(encodeURIComponent(trackGpx))),
        mediaType: 'application/gpx+xml',
      }, {
        validateStatus: status => status === 201,
        cancelToken: source.token,
      })
        .then(({ data }) => {
          dispatch(trackViewerSetTrackUID(data.uid));
        })
        .catch((e) => {
          dispatch(toastsAddError(`Nepodarilo sa nahrať súbor: ${e.message}`));
        })
        .then(() => {
          storeDispatch(stopProgress(pid));
          done();
        });
    }
  },
});

export const gpxLoadLogic = createLogic({
  type: 'GPX_LOAD',
  process({ getState }, dispatch, done) {
    const pid = Math.random();
    dispatch(startProgress(pid));

    axios.get(getState().trackViewer.gpxUrl, { validateStatus: status => status === 200 })
      .then(({ data }) => {
        dispatch(trackViewerSetData({ trackGpx: data }));
      })
      .catch((e) => {
        dispatch(toastsAddError(`Nastala chyba pri získavaní GPX záznamu: ${e.message}`));
      })
      .then(() => {
        dispatch(stopProgress(pid));
        done();
      });
  },
});


function toNodes(data) {
  const nodes = {};
  const nodeRes = data.evaluate('/osm/node', data, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
  for (let x = nodeRes.iterateNext(); x; x = nodeRes.iterateNext()) {
    nodes[x.getAttribute('id')] = ['lon', 'lat'].map(c => parseFloat(x.getAttribute(c)));
  }
  return nodes;
}

function toWays(data, nodes) {
  const ways = {};
  const wayRes = data.evaluate('/osm/way', data, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
  for (let x = wayRes.iterateNext(); x; x = wayRes.iterateNext()) {
    const coordinates = [];

    const ndRefRes = data.evaluate('nd/@ref', x, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    for (let y = ndRefRes.iterateNext(); y; y = ndRefRes.iterateNext()) {
      coordinates.push(nodes[y.value]);
    }

    ways[x.getAttribute('id')] = coordinates;
  }
  return ways;
}

export const osmLoadNodeLogic = createLogic({
  type: 'OSM_LOAD_NODE',
  process({ getState }, dispatch, done) {
    const pid = Math.random();
    dispatch(startProgress(pid));

    axios.get(
      `//api.openstreetmap.org/api/0.6/node/${getState().trackViewer.osmNodeId}`,
      {
        responseType: 'document',
        validateStatus: status => status === 200,
      },
    )
      .then(({ data }) => {
        const nodes = toNodes(data);

        dispatch(trackViewerSetData({
          trackGeojson: {
            type: 'FeatureCollection',
            features: Object.keys(nodes).map(id => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: nodes[id],
              },
            })),
          },
          startPoints: [],
          finishPoints: [],
        }));
      })
      .catch((e) => {
        dispatch(toastsAddError(`Nastala chyba pri získavaní OSM dát: ${e.message}`));
      })
      .then(() => {
        dispatch(stopProgress(pid));
        done();
      });
  },
});

export const osmLoadWayLogic = createLogic({
  type: 'OSM_LOAD_WAY',
  process({ getState }, dispatch, done) {
    const pid = Math.random();
    dispatch(startProgress(pid));

    axios.get(
      `//api.openstreetmap.org/api/0.6/way/${getState().trackViewer.osmWayId}/full`,
      {
        responseType: 'document',
        validateStatus: status => status === 200,
      },
    )
      .then(({ data }) => {
        const ways = toWays(data, toNodes(data));

        dispatch(trackViewerSetData({
          trackGeojson: {
            type: 'FeatureCollection',
            features: Object.keys(ways).map(id => ({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: ways[id],
              },
            })),
          },
          startPoints: [],
          finishPoints: [],
        }));
      })
      .catch((e) => {
        dispatch(toastsAddError(`Nastala chyba pri získavaní OSM dát: ${e.message}`));
      })
      .then(() => {
        dispatch(stopProgress(pid));
        done();
      });
  },
});

export const osmLoadRelationLogic = createLogic({
  type: 'OSM_LOAD_RELATION',
  process({ getState }, dispatch, done) {
    const pid = Math.random();
    dispatch(startProgress(pid));

    axios.get(
      `//api.openstreetmap.org/api/0.6/relation/${getState().trackViewer.osmRelationId}/full`,
      {
        responseType: 'document',
        validateStatus: status => status === 200,
      },
    )
      .then(({ data }) => {
        const nodes = toNodes(data);

        const ways = toWays(data, nodes);

        const features = [];

        const relationRes = data.evaluate('/osm/relation/member', data, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        for (let x = relationRes.iterateNext(); x; x = relationRes.iterateNext()) {
          const type = x.getAttribute('type');
          const ref = x.getAttribute('ref');
          switch (type) {
            case 'node':
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: nodes[ref],
                },
              });
              break;
            case 'way':
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: ways[ref],
                },
              });
              break;
            case 'relation':
            default:
              break;
          }
          nodes[x.getAttribute('type')] = ['lon', 'lat'].map(c => parseFloat(x.getAttribute(c)));
        }

        const trackGeojson = {
          type: 'FeatureCollection',
          features,
        };

        dispatch(trackViewerSetData({
          trackGeojson,
          startPoints: [],
          finishPoints: [],
        }));
      })
      .catch((e) => {
        dispatch(toastsAddError(`Nastala chyba pri získavaní OSM dát: ${e.message}`));
      })
      .then(() => {
        dispatch(stopProgress(pid));
        done();
      });
  },
});

export default [
  trackViewerSetTrackDataLogic,
  trackViewerDownloadTrackLogic,
  trackViewerUploadTrackLogic,
  gpxLoadLogic,
  osmLoadNodeLogic,
  osmLoadWayLogic,
  osmLoadRelationLogic,
];
