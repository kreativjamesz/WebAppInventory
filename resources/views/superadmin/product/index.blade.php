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
				<h1 class="page-header">Product</h1>
			</div>
		</div><!--/.row-->
		
		<div class="row">
			<div class="col-lg-12">
				<div class="panel panel-default">
					<div class="panel-heading"><a href="{{route('product.create')}}" class="btn btn-default pull-right" ><em class="fa fa-plus">&nbsp;</em> Create New Product</a>Product Table</div>
					<div class="panel-body">
						<div class="table-responsive">
							<table class="table table-condensed table-hover">
								<thead>
									<tr>
										<th width="40%">Name</th>
										<th width="30%">Cost</th>
										<th width="30%">SRP</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td>I don't know what to pust</td>
										<td>100.00</td>
										<td>450.00</td>
									</tr>
									<tr>
										<td>This is a sample name</td>
										<td>150.00</td>
										<td>550.00</td>
									</tr>
									<tr>
										<td>Product number 3</td>
										<td>170.00</td>
										<td>600.00</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
@endsection

@section('scripts')
	<script src="{{asset('js/all.js')}}"></script>
@endsection