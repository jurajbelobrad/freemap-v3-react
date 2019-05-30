import { connect } from 'react-redux';
import * as React from 'react';

import Modal from 'react-bootstrap/lib/Modal';

import { setActiveModal } from 'fm3/actions/mainActions';
import Devices from './Devices';
import DeviceForm from './DeviceForm';
import AccessTokens from './AccessTokens';
import AccessTokenForm from './AccessTokenForm';
import TrackedDevices from './TrackedDevices';
import TrackedDeviceForm from './TrackedDeviceForm';

type Views =
  | 'devices'
  | 'deviceForm'
  | 'accessTokens'
  | 'accessTokenForm'
  | 'trackedDevices'
  | 'trackedDeviceForm';

interface StateProps {
  view: Views;
}

interface DispatchProps {
  onClose: () => void;
}

const TrackingModal: React.FC<StateProps & DispatchProps> = ({
  onClose,
  view,
}) => {
  return (
    <Modal onHide={onClose} show bsSize="large">
      {view === 'devices' && <Devices />}
      {view === 'deviceForm' && <DeviceForm />}
      {view === 'accessTokens' && <AccessTokens />}
      {view === 'accessTokenForm' && <AccessTokenForm />}
      {view === 'trackedDevices' && <TrackedDevices />}
      {view === 'trackedDeviceForm' && <TrackedDeviceForm />}
    </Modal>
  );
};

export default connect<StateProps, DispatchProps, {}, any>(
  state => ({
    devices: state.tracking.devices,
    view:
      state.main.activeModal === 'tracking-my'
        ? state.tracking.modifiedDeviceId !== undefined
          ? 'deviceForm'
          : state.tracking.accessTokensDeviceId
          ? state.tracking.modifiedAccessTokenId !== undefined
            ? 'accessTokenForm'
            : 'accessTokens'
          : 'devices'
        : state.tracking.modifiedTrackedDeviceId !== undefined
        ? 'trackedDeviceForm'
        : 'trackedDevices',
  }),
  dispatch => ({
    onClose() {
      dispatch(setActiveModal(null));
    },
  }),
)(TrackingModal);