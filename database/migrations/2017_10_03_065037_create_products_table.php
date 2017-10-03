<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateProductsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('products', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');             // Product Name
            $table->string('slug')->unique();   // Slugs for name
            $table->text('desc');               // Description

            //Inventory Details
            $table->string('category');         // Product Cateogry
            $table->string('barcode');          // atleast 12 Digit Barcode
            $table->string('upc');              // universal product code, atleast 11 digit number
            $table->integer('in_stock');        // In Stock
            $table->decimal('cost',5,2);        // Cost Price
            $table->decimal('srp',5,2);         // Selling Retail Price

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('products');
    }
}
