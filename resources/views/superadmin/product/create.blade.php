@extends('superadmin.layouts.master')
@section('styles')
	<link rel="stylesheet" href="{{asset('css/all.css')}}">
@endsection
@section('content')
	@include('superadmin.layouts.partials.navbar')
	@include('superadmin.layouts.partials.sidebar')
	
	<div class="col-sm-9 col-sm-offset-3 col-lg-10 col-lg-offset-2 main">

		<div class="row">
			<ul class="breadcrumb"> 
				<li> 
					<a href="{{route('dashboard')}}"><i class="fa fa-home">&nbsp;</i> Dashboard</a> 
				</li> 
				@for($i = 1; $i <= count(Request::segments()); $i++) 
					<li> 
						@if($i < count(Request::segments()) & $i > 0) 
							<a href="{!! "/" . Request::segment($i); !!}">{{Request::segment($i)}}</a> 
						@else 
							{{Request::segment($i)}} 
						@endif 
					</li> 
				@endfor 
			</ul>
		</div><!--/.row-->
		
		<div class="row">
			<div class="col-lg-12">
				<h1 class="page-header">Create	 Product</h1>
			</div>
		</div><!--/.row-->

		<div class="row">
			<div class="col-lg-12">
				<div class="panel panel-default">
					<div class="panel-heading"><a href="{{route('product.create')}}" class="btn btn-primary pull-right" ><em class="fa fa-arrow-left">&nbsp;</em> Back</a>Product Form</div>
					<div class="panel-body">
						<div class="row">
							<div class="col-md-8">
			              		<div class="form-group">
			              			<label for="input" class="col-md-3 control-label">Category:</label>
			              			<div class="col-md-4">
			              				<select name="" id="input" class="form-control" required="required">
			              					<option value="top">Tops</option>
			              					<option value="top">Bottom</option>
			              					<option value="top">Dress</option>
			              					<option value="top">Accessories</option>
			              				</select>
			              			</div>
			              		</div>
		              		</div>
							<div class="col-md-offset-1 col-md-3">
								<div class="image-upload ">
							        <div>
							            <div>
							              <div>
							                <i class="icon-image default-image"></i>
							              </div>
							              <div>
							                <label class="text-muted drag-text">Drag here to upload </label> <br>
							                <a class="small">(or) Browse</a>
							              </div>
							            </div>
							            <span id="upload"><input accept="image/gif,image/jpeg,image/png,image/bmp,image/jpg" type="file" id="ember1277" class="form-control upload ember-view"></span>
							        </div>
							      </div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

@endsection

@section('scripts')
	<script src="{{asset('js/all.js')}}"></script>
@endsection