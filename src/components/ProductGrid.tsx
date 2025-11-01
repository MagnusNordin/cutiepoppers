import React from "react";
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Chip,
  CardActionArea,
} from "@mui/material";
import { Product } from "../types/Product";

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onProductClick,
}) => {
  return (
    <Grid container spacing={4} sx={{ padding: 3 }}>
      {products.map((product) => (
        <Grid
          component="div"
          key={product.id}
          sx={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }}
        >
          <Card
            sx={{
              height: "320px",
              width: "280px",
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease-in-out",
              "&:hover": {
                transform: "translateY(-8px)",
                boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
              },
            }}
          >
            <CardActionArea
              onClick={() => onProductClick(product)}
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardMedia
                component="img"
                sx={{
                  width: "160px",
                  height: "160px",
                  objectFit: "cover",
                  flexShrink: 0,
                  borderRadius: "12px 12px 0 0",
                }}
                image={product.images[0]}
                alt={product.title}
              />
              <CardContent
                sx={{
                  height: "140px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  padding: "16px",
                }}
              >
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  {product.title}
                </Typography>

                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontWeight: "bold" }}
                  >
                    Örhänge: {product.priceEarrings} kr
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontWeight: "bold" }}
                  >
                    Nyckelring: {product.priceKeychain} kr
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ProductGrid;
