import axios from 'axios';
import { createLogic } from 'redux-logic';
import { searchSetResults } from 'fm3/actions/searchActions';
import { startProgress, stopProgress } from 'fm3/actions/mainActions';
import { toastsAddError } from 'fm3/actions/toastsActions';

export default createLogic({
  type: 'SEARCH_SET_QUERY',
  cancelType: ['SEARCH_SET_QUERY', 'SET_TOOL', 'CLEAR_MAP'],
  process({ getState, cancelled$, storeDispatch }, dispatch, done) {
    const { query } = getState().search;
    if (!query) {
      done();
      return;
    }

    const pid = Math.random();
    dispatch(startProgress(pid));
    const source = axios.CancelToken.source();
    cancelled$.subscribe(() => {
      source.cancel();
    });

    axios.get(`//old.freemap.sk/api/0.3/searchhint/${encodeURIComponent(query)}`, {
      params: {
        max_count: 10,
      },
      validateStatus: status => status === 200,
      cancelToken: source.token,
    })
      .then(({ data }) => {
        const results = data.results.map((d, id) => {
          const { name } = d.properties;
          const geometryType = d.geometry.type;
          const tags = { name, type: geometryType };
          let centerLonlat;
          if (geometryType === 'Point') {
            centerLonlat = d.geometry.coordinates;
          } else if (geometryType === 'MultiLineString') {
            [[centerLonlat]] = d.geometry.coordinates;
          } else {
            [centerLonlat] = d.geometry.coordinates;
          }
          const [centerLon, centerLat] = centerLonlat;
          return {
            id, label: name, geojson: d.geometry, lat: centerLat, lon: centerLon, tags,
          };
        });
        dispatch(searchSetResults(results));
      })
      .catch((e) => {
        dispatch(toastsAddError(`Nastala chyba pri spracovaní výsledkov vyhľadávania: ${e.message}`));
      })
      .then(() => {
        storeDispatch(stopProgress(pid));
        done();
      });
  },
});
