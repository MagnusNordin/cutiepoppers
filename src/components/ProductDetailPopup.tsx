import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Chip,
  Button,
  Grid,
  Card,
  CardMedia,
} from "@mui/material";
import {
  Close as CloseIcon,
  ArrowBackIos,
  ArrowForwardIos,
} from "@mui/icons-material";
import { Product } from "../types/Product";
import ContactInfo from "./ContactInfo";

interface ProductDetailPopupProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const ProductDetailPopup: React.FC<ProductDetailPopupProps> = ({
  product,
  open,
  onClose,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h5" component="div" sx={{ fontWeight: "bold" }}>
          {product.title}
        </Typography>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Image Section */}
          <Grid component="div" sx={{ xs: 12, md: 6 }}>
            <Box sx={{ position: "relative" }}>
              <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
                <CardMedia
                  component="img"
                  sx={{
                    width: "100%",
                    height: "400px",
                    objectFit: "cover",
                  }}
                  image={product.images[currentImageIndex]}
                  alt={`${product.title} - Image ${currentImageIndex + 1}`}
                />
              </Card>

              {/* Navigation Arrows */}
              {product.images.length > 1 && (
                <>
                  <IconButton
                    onClick={handlePreviousImage}
                    sx={{
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                      },
                    }}
                  >
                    <ArrowBackIos />
                  </IconButton>
                  <IconButton
                    onClick={handleNextImage}
                    sx={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                      },
                    }}
                  >
                    <ArrowForwardIos />
                  </IconButton>
                </>
              )}

              {/* Thumbnail Navigation */}
              {product.images.length > 1 && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    mt: 2,
                    justifyContent: "center",
                  }}
                >
                  {product.images.map((image, index) => (
                    <Card
                      key={index}
                      sx={{
                        width: 60,
                        height: 60,
                        cursor: "pointer",
                        border: currentImageIndex === index ? 2 : 0,
                        borderColor: "primary.main",
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                      onClick={() => handleImageClick(index)}
                    >
                      <CardMedia
                        component="img"
                        sx={{
                          width: "100%",
                          height: "60px",
                          objectFit: "cover",
                        }}
                        image={image}
                        alt={`Thumbnail ${index + 1}`}
                      />
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          </Grid>

          {/* Product Details Section */}
          <Grid component="div" sx={{ xs: 12, md: 6 }}>
            <Box
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              {/* <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Chip
                    label={product.category}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Box> */}

              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Priser
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ mb: 0.5 }}
                >
                  Örhänge: {product.priceEarrings} kr
                </Typography>
                <Typography
                  variant="h6"
                >
                  Nyckelring: {product.priceKeychain} kr
                </Typography>
              </Box>

              <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                {product.description}
              </Typography>

              <Box sx={{ mt: "auto" }}>
                <ContactInfo />
                {/* <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={!product.inStock}
                  sx={{
                    py: 1.5,
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                  }}
                >
                  {product.inStock ? "Lägg i varukorg" : "Slut i lager"}
                </Button> */}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailPopup;
