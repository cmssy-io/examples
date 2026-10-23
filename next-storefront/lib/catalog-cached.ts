import { cache } from "react";
import {
  loadBrandBySlug as loadBrandBySlugOnce,
  loadCategories as loadCategoriesOnce,
  loadProductBySlug as loadProductBySlugOnce,
} from "./catalog";

export const loadBrandBySlug = cache(loadBrandBySlugOnce);
export const loadCategories = cache(loadCategoriesOnce);
export const loadProductBySlug = cache(loadProductBySlugOnce);
