<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
	protected $fillable = [
		// Basic Information
		'name',			// Name
		'slug', 		// slugs
		'desc', 		// Description
		'category',		// Category Name
		'barcode', 		// Bar Code, atleast 12 numbers.
		'upc',			// Universal Product Code
		'in_stock',		// In Stock count
		'cost',			// Cost Price
		'srp',			// Selling Retail Price
	];

	public function setNameAttribute($value)
	{
		$this->attributes['name'] = $value;

    	if (! $this->exists) {
      		$this->attributes['slug'] = str_slug($value);
    	}

	}


}
