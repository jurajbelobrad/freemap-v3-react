import React, { Fragment, useState, useCallback, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Polyline, Tooltip, CircleMarker, Circle } from 'react-leaflet';
import RichMarker from 'fm3/components/RichMarker';
import FontAwesomeIcon from 'fm3/components/FontAwesomeIcon';

// TODO functional component with hooks was causing massive re-rendering
class TrackingResult extends React.Component {
  state = {
    activePoint: null,
  };

  handleActivePointSet = (activePoint) => {
    this.setState({
      activePoint,
    });
  }

  render() {
    const { tracks, showLine, showPoints, language } = this.props;
    const df = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return tracks.map((track) => {
      const color = track.color || '#7239a8';
      const width = track.width || 4;

      return (
        <Fragment key={track.id}>
          {track.trackPoints.length > 0 && (
            <Circle
              weight={2}
              interactive={false}
              center={track.trackPoints[track.trackPoints.length - 1]}
              radius={track.trackPoints[track.trackPoints.length - 1].accuracy}
            />
          )}

          {this.state.activePoint && (
            <Circle
              weight={2}
              interactive={false}
              center={this.state.activePoint}
              radius={this.state.activePoint.accuracy}
            />
          )}

          {showLine && (
            <Polyline
              positions={track.trackPoints}
              weight={width}
              color={color}
            />
          )}

          {showPoints && track.trackPoints.map((tp, i) => (
            i === track.trackPoints.length - 1 ? (
              <RichMarker
                key={tp.id}
                position={track.trackPoints[track.trackPoints.length - 1]}
                color={color}
              >
                <Tooltip direction="top" offset={[0, -36]} permanent>
                  {tooltipText(df, tp, track.label)}
                </Tooltip>
              </RichMarker>
            ) : (
              <TrackingPoint
                key={tp.id}
                tp={tp}
                width={width}
                color={color}
                language={language}
                onActivePointSet={this.handleActivePointSet}
              />
            )
          ))}
        </Fragment>
      );
    });
  }
}

// TODO to separate file
// eslint-disable-next-line
const TrackingPoint = React.memo(({ tp, width, color, language, onActivePointSet }) => {
  const df = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleMouseOver = useCallback(() => {
    if (onActivePointSet) {
      onActivePointSet(tp);
    }
  }, [tp, onActivePointSet]);

  const handleMouseOut = useCallback(() => {
    if (onActivePointSet) {
      onActivePointSet(null);
    }
  }, [onActivePointSet]);

  return (
    <CircleMarker
      stroke={false}
      center={tp}
      radius={width}
      color={color}
      fillOpacity={1}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      <Tooltip direction="top" offset={[0, -1.5 * width]}>
        {tooltipText(df, tp)}
      </Tooltip>
    </CircleMarker>
  );
});

// eslint-disable-next-line
function tooltipText(df, { battery, ts, gsmSignal, speed, message, altitude }, label) {
  // TODO bearing

  const items = [];

  if (typeof altitude === 'number') {
    items.push(['long-arrow-up', `${altitude} m`]); // TODO format number
  }

  if (typeof speed === 'number') {
    items.push(['dashboard', `${speed} ㎧`]); // TODO format number
  }

  if (typeof gsmSignal === 'number') {
    items.push(['signal', `${gsmSignal} %`]);
  }

  if (typeof battery === 'number') {
    items.push([
      `battery-${battery < 12.5 ? 0 : battery < 25 + 12.5 ? 1 : battery < 50 + 12.5 ? 2 : battery < 75 + 12.5 ? 3 : 4}`,
      `${battery} %`,
    ]);
  }

  return (
    <div>
      {label && <div><b>{label}</b></div>}
      <div><FontAwesomeIcon icon="clock-o" /> {df.format(ts)}</div>
      <div>
        {items.map(([icon, text], i) => (
          <Fragment key={icon}>
            <FontAwesomeIcon key={icon} icon={icon} /> {text}
            {i < items.length - 1 ? '｜' : null}
          </Fragment>
        ))}
      </div>
      {message && <div><FontAwesomeIcon icon="bubble-o" /> {message}</div>}
    </div>
  );
}

TrackingResult.propTypes = {
  tracks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    trackPoints: PropTypes.arrayOf(PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lon: PropTypes.number.isRequired,
    }).isRequired).isRequired,
    // TODO other
  }).isRequired).isRequired,
  showLine: PropTypes.bool,
  showPoints: PropTypes.bool,
  language: PropTypes.string,
};

export default connect((state) => {
  const tdMap = new Map(state.tracking.trackedDevices.map(td => [td.id, td]));
  return {
    tracks: state.tracking.tracks.map(track => ({ ...track, ...(tdMap.get(track.id) || {}) })),
    showLine: state.tracking.showLine,
    showPoints: state.tracking.showPoints,
    language: state.l10n.language,
  };
})(TrackingResult);
