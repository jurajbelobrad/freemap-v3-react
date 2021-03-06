/* eslint-disable jsx-a11y/no-static-element-interactions */ // prevented warning in bootstrap code

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import FontAwesomeIcon from 'fm3/components/FontAwesomeIcon';
import ReactStars from 'react-stars';

import Modal from 'react-bootstrap/lib/Modal';
import Glyphicon from 'react-bootstrap/lib/Glyphicon';
import Button from 'react-bootstrap/lib/Button';
import Label from 'react-bootstrap/lib/Label';
import InputGroup from 'react-bootstrap/lib/InputGroup';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';

import { toastsAdd } from 'fm3/actions/toastsActions';

import GalleryEditForm from 'fm3/components/GalleryEditForm';

import * as FmPropTypes from 'fm3/propTypes';

import { galleryClear, galleryRequestImage, galleryShowOnTheMap, gallerySetComment, gallerySubmitComment, gallerySubmitStars,
  galleryEditPicture, galleryDeletePicture, gallerySetEditModel, gallerySavePicture, gallerySetItemForPositionPicking } from 'fm3/actions/galleryActions';

import 'fm3/styles/gallery.scss';

const dateFormat = new Intl.DateTimeFormat('sk', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

class GalleryViewerModal extends React.Component {
  static propTypes = {
    imageIds: PropTypes.arrayOf(PropTypes.number.isRequired),
    image: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      user: PropTypes.shape({
        // TODO
      }),
      // TODO , createdAt, takenAt, tags, comments
      rating: PropTypes.number.isRequired,
      myStars: PropTypes.number,
    }),
    activeImageId: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    onImageSelect: PropTypes.func.isRequired,
    comment: PropTypes.string.isRequired,
    onShowOnTheMap: PropTypes.func.isRequired,
    onCommentChange: PropTypes.func.isRequired,
    onCommentSubmit: PropTypes.func.isRequired,
    onStarsChange: PropTypes.func.isRequired,
    user: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      isAdmin: PropTypes.bool,
    }),
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    editModel: FmPropTypes.galleryPictureModel,
    onEditModelChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    allTags: FmPropTypes.allTags.isRequired,
    onPositionPick: PropTypes.func.isRequired,
  }

  state = {
    loading: true,
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeydown);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.activeImageId !== this.props.activeImageId) {
      this.setState({
        loading: true,
      });
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeydown);
  }

  setImageElement = (imageElement) => {
    this.imageElement = imageElement;
    if (imageElement) {
      imageElement.addEventListener('load', this.handleImageLoad);
    }
  }

  handleEditModelChange = (editModel) => {
    this.props.onEditModelChange(editModel);
  }

  handleKeydown = (evt) => {
    if (['input', 'select', 'textarea'].includes(evt.target.tagName.toLowerCase())
      || !this.props.imageIds || this.props.imageIds.length < 2) {
      // nothing
    } else if (evt.keyCode === 37 /* left key */) {
      this.handlePreviousClick();
    } else if (evt.keyCode === 39 /* right key */) {
      this.handleNextClick();
    }
  }

  handlePreviousClick = (e) => {
    if (e) {
      e.preventDefault();
    }

    const { imageIds, activeImageId, onImageSelect } = this.props;
    const index = imageIds.findIndex(id => id === activeImageId);
    if (index > 0) {
      onImageSelect(imageIds[index - 1]);
    }
  }

  handleNextClick = (e) => {
    if (e) {
      e.preventDefault();
    }

    const { imageIds, activeImageId, onImageSelect } = this.props;
    const index = imageIds.findIndex(id => id === activeImageId);
    if (index + 1 < imageIds.length) {
      onImageSelect(imageIds[index + 1]);
    }
  }

  handleCommentFormSubmit = (e) => {
    e.preventDefault();
    this.props.onCommentSubmit();
  }

  handleCommentChange = (e) => {
    this.props.onCommentChange(e.target.value);
  }

  handleImageLoad = () => {
    this.setState({ loading: false });
  }

  render() {
    const {
      imageIds, activeImageId, onClose, onShowOnTheMap, image, comment,
      onStarsChange, user, onDelete, onEdit, editModel, onSave, allTags, onPositionPick,
    } = this.props;
    const index = imageIds && imageIds.findIndex(id => id === activeImageId);
    const {
      title = '...', description, createdAt, takenAt, tags, comments, rating, myStars,
    } = image || {};

    // TODO const loadingMeta = !image || image.id !== activeImageId;

    return (
      <Modal show onHide={onClose} bsSize="large">
        <Modal.Header closeButton>
          <Modal.Title>
            Fotografia {imageIds ? `${index + 1} / ${imageIds.length} ` : ''}{title && `- ${title}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="carousel">
            <div className="item active">
              <a
                href={`${process.env.API_URL}/gallery/pictures/${activeImageId}/image`}
                target="freemap_gallery_image"
              >
                <img
                  ref={this.setImageElement}
                  className={`gallery-image ${this.state.loading ? 'loading' : ''}`}
                  src={`${process.env.API_URL}/gallery/pictures/${activeImageId}/image?width=${window.matchMedia('(min-width: 992px)').matches ? 868 : 568}`}
                  sizes="(min-width: 992px) 868px, 568px"
                  alt={title}
                />
              </a>
            </div>
            {imageIds &&
              <a
                className={`left carousel-control ${index < 1 ? 'disabled' : ''}`}
                onClick={this.handlePreviousClick}
              >
                <Glyphicon glyph="chevron-left" />
              </a>
            }
            {imageIds &&
              <a
                className={`right carousel-control ${index >= imageIds.length - 1 ? 'disabled' : ''}`}
                onClick={this.handleNextClick}
              >
                <Glyphicon glyph="chevron-right" />
              </a>
            }
          </div>
          {image && [
            <div key="2HcEmCGRpH">
              Nahral <b>{image.user.name}</b> dňa <b>{dateFormat.format(createdAt)}</b>
              {takenAt && <span>. Odfotené dňa <b>{dateFormat.format(takenAt)}</b>.</span>}
              {' '}
              <ReactStars className="stars" size={22} value={rating} edit={false} />
              {description && ` ${description}`}
              {tags.map(tag => <span key={tag}> <Label>{tag}</Label></span>)}
            </div>,

            editModel && (
              <div key="C1QixU3csh">
                <hr />
                <h5>Úprava</h5>

                <GalleryEditForm
                  model={editModel}
                  allTags={allTags}
                  error={null}
                  onPositionPick={onPositionPick}
                  onModelChange={this.handleEditModelChange}
                />
                {/* TODO put inside a form and save in onSubmit */}
                <Button bsStyle="primary" onClick={onSave}><Glyphicon glyph="save" /> Uložiť</Button>
              </div>
            ),

            <hr key="QNnbIaEx28" />,
            <h5 key="h4AU4xskDv">Komentáre</h5>,
            ...comments.map(c => (
              <p key={c.id}>
                {dateFormat.format(c.createdAt)} <b>{c.user.name}</b>: {c.comment}
              </p>
            )),
            user && (
              <form key="U7Ur2II0Zf" onSubmit={this.handleCommentFormSubmit}>
                <FormGroup>
                  <InputGroup>
                    <FormControl type="text" placeholder="Nový komentár" value={comment} onChange={this.handleCommentChange} maxLength={4096} />
                    <InputGroup.Button>
                      <Button type="submit" disabled={comment.length < 1}>Pridaj</Button>
                    </InputGroup.Button>
                  </InputGroup>
                </FormGroup>
              </form>
            ),
            user && (
              <div key="Hz24KokgQm">
                Tvoje hodnotenie: <ReactStars className="stars" size={22} half={false} value={myStars} onChange={onStarsChange} />
              </div>
            ),
          ]}
        </Modal.Body>
        <Modal.Footer>
          {image && user && (user.isAdmin || user.id === image.user.id) && [
            <Button key="5zKw4dOTCW" onClick={onEdit} active={!!editModel}><Glyphicon glyph="edit" /><span className="hidden-xs"> Upraviť</span></Button>,
            <Button key="aVtUvbbC44" onClick={onDelete} bsStyle="danger"><Glyphicon glyph="trash" /><span className="hidden-xs"> Zmazať</span></Button>,
          ]}
          <Button onClick={onShowOnTheMap}><FontAwesomeIcon icon="dot-circle-o" /><span className="hidden-xs"> Ukázať na mape</span></Button>
          <Button onClick={onClose}><Glyphicon glyph="remove" /><span className="hidden-xs"> Zavrieť</span></Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default connect(
  state => ({
    imageIds: state.gallery.imageIds,
    image: state.gallery.image,
    activeImageId: state.gallery.activeImageId,
    zoom: state.map.zoom,
    pickingPosition: state.gallery.pickingPositionForId !== null,
    comment: state.gallery.comment,
    editModel: state.gallery.editModel,
    user: state.auth.user,
    allTags: state.gallery.tags,
  }),
  dispatch => ({
    onClose() {
      dispatch(galleryClear(null));
    },
    onShowOnTheMap() {
      dispatch(galleryShowOnTheMap(true));
    },
    onImageSelect(id) {
      dispatch(galleryRequestImage(id));
    },
    onCommentChange(comment) {
      dispatch(gallerySetComment(comment));
    },
    onCommentSubmit() {
      dispatch(gallerySubmitComment());
    },
    onStarsChange(stars) {
      dispatch(gallerySubmitStars(stars));
    },
    onEdit() {
      dispatch(galleryEditPicture());
    },
    onDelete() {
      dispatch(toastsAdd({
        collapseKey: 'gallery.deletePicture',
        message: 'Zmazať obrázok?',
        style: 'warning',
        cancelType: ['GALLERY_CLEAR', 'GALLERY_REQUEST_IMAGE'],
        actions: [
          { name: 'Áno', action: galleryDeletePicture(), style: 'danger' },
          { name: 'Nie' },
        ],
      }));
    },
    onEditModelChange(editModel) {
      dispatch(gallerySetEditModel(editModel));
    },
    onSave() {
      dispatch(gallerySavePicture());
    },
    onPositionPick() {
      dispatch(gallerySetItemForPositionPicking(-1));
    },
  }),
)(GalleryViewerModal);
