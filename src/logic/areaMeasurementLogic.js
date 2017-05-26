import { createLogic } from 'redux-logic';

import { area } from 'fm3/geoutils';

import { toastsAdd } from 'fm3/actions/toastsActions';

const nf = Intl.NumberFormat('sk', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const areaMeasurementExportGpxLogic = createLogic({
  type: /AREA_MEASUREMENT_.*/,
  process({ getState }, dispatch, done) {
    const points = getState().areaMeasurement.points;

    if (points.length > 2) {
      const areaSize = area(points);

      dispatch(toastsAdd({
        collapseKey: 'areaMeasurement.result',
        message: `
        <div>${nf.format(areaSize)} m<sup>2</sup></div>
        <div>${nf.format(areaSize / 100)} a</div>
        <div>${nf.format(areaSize / 10000)} ha</div>
        <div>${nf.format(areaSize / 1000000)} km<sup>2</sup></div>
        `,
        style: 'info',
        cancelType: 'SET_TOOL',
      }));
    } else {
      // TODO remove toast by collapse key "areaMeasurement.result"
    }

    done();
  },
});

export default areaMeasurementExportGpxLogic;
