<?php

namespace App\Http\Controllers\API;

use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Models\Company\Labour;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\BaseController;
use Illuminate\Support\Facades\Validator;
use App\Http\Resources\API\Labours\LaboursResources;

class LaboursController extends BaseController
{
    public function listLabour(Request $request)
    {
        $authCompany = Auth::guard('company-api')->user()->company_id;
        $data = Labour::with('units')->where('company_id', $authCompany)->orderBy('id','desc')->get();
        $message = $data->isNotEmpty() ? 'Fetch Labours List Successfully' : 'Labours List Data Not Found';
        return $this->responseJson(true, 200, $message, LaboursResources::collection($data));
    }

    public function addLabour(Request $request)
    {
        $authCompany = Auth::guard('company-api')->user()->company_id;
        $validator = Validator::make($request->all(), [
            'name' => 'required',
            'category' => 'required|in:skilled,semiskilled,unskilled',
            'unit_id' => 'required',
            'code' => 'nullable|string|max:50',
        ]);
        if ($validator->fails()) {
            $status = false;
            $code = 422;
            $response = [];
            $message = $validator->errors()->first();
            return $this->responseJson($status, $code, $message, $response);
        }
        DB::beginTransaction();
        try {
            $findId = Labour::find($request->updateId);
            if (isset($findId)) {
                // Update existing labour
                $updateData = [
                    'name' => $request->name,
                    'category' => $request->category,
                    'unit_id' => $request->unit_id,
                ];
                if ($request->filled('code')) {
                    $updateData['code'] = $request->code;
                }
                $isLabourUpdate = Labour::where('id', $request->updateId)->update($updateData);
                $message = 'Labours Update Successfully';
            } else {
                // Generate code if not provided
                $code = $request->code;
                if (empty($code)) {
                    $code = $this->generateLabourCode($authCompany);
                }
                $isLabourCreated = Labour::create([
                    'uuid' => Str::uuid(),
                    'name' => $request->name,
                    'category' => $request->category,
                    'unit_id' => $request->unit_id,
                    'company_id' => $authCompany,
                    'code' => $code,
                ]);
                $message = 'Labours Create Successfully';
            }
            if (isset($isLabourCreated) || isset($isLabourUpdate)) {
                DB::commit();
                return $this->responseJson(true, 201, $message, $isLabourCreated ?? $isLabourUpdate);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            logger($e->getMessage() . ' on ' . $e->getFile() . ' in ' . $e->getLine());
            return $this->responseJson(false, 500, $e->getMessage(), []);
        }
    }

    /**
     * Generate unique labour code for company (e.g. LAB0001, LAB0002)
     */
    private function generateLabourCode(int $companyId): string
    {
        $labours = Labour::where('company_id', $companyId)
            ->whereNotNull('code')
            ->where('code', 'LIKE', 'LAB%')
            ->pluck('code');

        $maxNum = 0;
        foreach ($labours as $code) {
            if (preg_match('/^LAB(\d+)$/', $code, $matches)) {
                $maxNum = max($maxNum, (int) $matches[1]);
            }
        }

        return 'LAB' . str_pad((string) ($maxNum + 1), 4, '0', STR_PAD_LEFT);
    }

    public function labourSearch(Request $request)
    {
        $authCompany = Auth::guard('company-api')->user()->company_id;
        $datas = Labour::with('units')
            ->where('company_id', $authCompany)
            ->where('is_active', 1);

        if ($request->has('search_keyword') && $request->search_keyword != "") {
            $datas->where(function ($q) use ($request) {
                $q->where('name', 'LIKE', '%' . $request->search_keyword . '%');
            });
        }
        $datas = $datas->get();
        return LaboursResources::collection($datas);
    }

    public function edit($uuid)
    {
        $authCompany = Auth::guard('company-api')->user()->company_id;
        $data = Labour::where('id', $uuid)->where('company_id', $authCompany)->first();
        $message = 'Fetch Labour List Successfully';
        return $this->responseJson(true, 200, $message, new LaboursResources($data));
    }

    public function delete($uuid)
    {
        $authCompany = Auth::guard('company-api')->user()->company_id;
        $data = Labour::where('id', $uuid)
            ->where('company_id', $authCompany)
            ->delete();
        $message = $data > 0 ? 'Labour Delete Successfully' : 'Labour Data Not Found';
        return $this->responseJson(true, 200, $message, $data);
    }
}
